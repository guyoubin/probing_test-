const Database = require("../database");
const Report = require("../model/report");
const Monitor = require("../model/monitor");
const Heartbeat = require("../model/heartbeat");
const CyberProbeServer = require("../cyberprobe-server");
const { ScoreEngine } = require("../scoring/score-engine");
const { generateHTML } = require("../report/html-generator");
const { generateJSON } = require("../report/json-generator");
const dayjs = require("dayjs");
const fs = require("fs");
const path = require("path");

function reportSocketHandler(socket) {
    // "generateReport" - Trigger report generation
    socket.on("generateReport", async (data, callback) => {
        try {
            const { suite_type, monitor_ids, node_ids, name, format } = data || {};

            if (!monitor_ids || !Array.isArray(monitor_ids) || monitor_ids.length === 0) {
                return callback({ ok: false, error: "monitor_ids is required and must be a non-empty array" });
            }

            // Create report record in "generating" state
            const report = Report.create(Database.db, {
                user_id: socket.user.id,
                name: name || `${suite_type || "custom"} Report - ${dayjs().format("YYYY-MM-DD HH:mm")}`,
                suite_type: suite_type || "custom",
                monitor_ids_json: monitor_ids,
                node_ids_json: node_ids || [],
                status: "generating",
                format: format || "html",
            });

            // Return immediately with the report ID
            callback({ ok: true, report });

            // Generate the report asynchronously
            _generateReportAsync(socket, report, monitor_ids, node_ids, format);
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "getReportList" - Get list of reports
    socket.on("getReportList", async (data, callback) => {
        try {
            const reports = Report.getList(Database.db, socket.user.id);
            callback({ ok: true, reports });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "deleteReport" - Delete a report
    socket.on("deleteReport", async (data, callback) => {
        try {
            const { id } = data;
            if (!id) {
                return callback({ ok: false, error: "Report ID is required" });
            }

            const report = Report.getById(Database.db, id);
            if (!report || report.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Report not found" });
            }

            // Delete the file if it exists
            if (report.file_path && fs.existsSync(report.file_path)) {
                fs.unlinkSync(report.file_path);
            }

            Report.delete(Database.db, id);
            callback({ ok: true });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });
}

/**
 * Generate report content asynchronously and notify the user when done
 */
async function _generateReportAsync(socket, report, monitorIds, nodeIds, format) {
    const io = CyberProbeServer.getInstance().io;

    try {
        // Fetch monitors
        const monitors = [];
        for (const mid of monitorIds) {
            const m = Monitor.findById(Database.db, mid);
            if (m) monitors.push(m);
        }

        // Fetch recent heartbeats (last 24h)
        const heartbeats = Heartbeat.getRecentByMonitorIds(Database.db, monitorIds, 24);

        // Calculate scores
        const scores = monitors.map(m => {
            const mHeartbeats = heartbeats.filter(h => h.monitor_id === m.id);
            const lastHb = mHeartbeats.length > 0 ? mHeartbeats[0] : null;
            const score = lastHb ? ScoreEngine.calculate(lastHb, m) : 0;
            return { monitor_id: m.id, score };
        });

        const timestamp = dayjs().format("YYYY-MM-DD HH:mm:ss");
        const reportTitle = report.name || "CyberProbe Report";

        let filePath;
        if (format === "json") {
            const reportData = generateJSON({
                title: reportTitle,
                monitors,
                heartbeats,
                scores,
                timestamp,
            });
            filePath = path.join(
                process.env.DATA_DIR || "./data",
                "reports",
                `report-${report.id}.json`
            );
            _ensureDir(path.dirname(filePath));
            fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
        } else {
            const html = generateHTML({
                title: reportTitle,
                monitors,
                heartbeats,
                scores,
                timestamp,
            });
            filePath = path.join(
                process.env.DATA_DIR || "./data",
                "reports",
                `report-${report.id}.html`
            );
            _ensureDir(path.dirname(filePath));
            fs.writeFileSync(filePath, html);
        }

        // Calculate composite score
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
            : 0;

        // Update report record
        const updated = Report.update(Database.db, report.id, {
            status: "ready",
            file_path: filePath,
            composite_score: avgScore,
            end_time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        });

        // Push "reportReady" event
        if (io) {
            io.emit("reportReady", { ok: true, report: updated });
        }
    } catch (err) {
        console.error("Report generation failed:", err);
        Report.update(Database.db, report.id, {
            status: "failed",
            end_time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        });

        if (io) {
            io.emit("reportReady", { ok: false, error: err.message, reportId: report.id });
        }
    }
}

function _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

module.exports = { reportSocketHandler };
