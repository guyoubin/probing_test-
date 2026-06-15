const Database = require("../database");
const Heartbeat = require("../model/heartbeat");
const Monitor = require("../model/monitor");
const { ScoreEngine } = require("../scoring/score-engine");
const dayjs = require("dayjs");

function chartSocketHandler(socket) {
    // "getHeartbeatData" - Get heartbeat time-series data for a monitor
    socket.on("getHeartbeatData", async (data, callback) => {
        try {
            const { monitor_id, hours } = data || {};
            if (!monitor_id) {
                return callback({ ok: false, error: "monitor_id is required" });
            }

            const monitor = Monitor.findById(Database.db, monitor_id);
            if (!monitor || monitor.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            const hoursVal = hours || 24;
            const heartbeats = Heartbeat.getRecentByMonitorIds(Database.db, [monitor_id], hoursVal);

            const chartData = heartbeats.map(h => ({
                time: h.time,
                status: h.status,
                ping: h.ping,
                msg: h.msg,
            }));

            callback({ ok: true, data: chartData });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "getUptimeData" - Get uptime percentage data
    socket.on("getUptimeData", async (data, callback) => {
        try {
            const { monitor_id, days } = data || {};
            if (!monitor_id) {
                return callback({ ok: false, error: "monitor_id is required" });
            }

            const monitor = Monitor.findById(Database.db, monitor_id);
            if (!monitor || monitor.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            const daysVal = days || 30;
            const hoursVal = daysVal * 24;
            const heartbeats = Heartbeat.getRecentByMonitorIds(Database.db, [monitor_id], hoursVal);

            // Group by day
            const dayMap = {};
            for (const hb of heartbeats) {
                const day = hb.time ? hb.time.substring(0, 10) : "unknown";
                if (!dayMap[day]) {
                    dayMap[day] = { total: 0, up: 0 };
                }
                dayMap[day].total++;
                if (hb.status === 1) {
                    dayMap[day].up++;
                }
            }

            const uptimeData = Object.entries(dayMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, counts]) => ({
                    date,
                    uptime: counts.total > 0 ? parseFloat(((counts.up / counts.total) * 100).toFixed(2)) : 0,
                    total_checks: counts.total,
                    up_checks: counts.up,
                }));

            callback({ ok: true, data: uptimeData });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "getScoreData" - Get score trend data
    socket.on("getScoreData", async (data, callback) => {
        try {
            const { monitor_id, hours } = data || {};
            if (!monitor_id) {
                return callback({ ok: false, error: "monitor_id is required" });
            }

            const monitor = Monitor.findById(Database.db, monitor_id);
            if (!monitor || monitor.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            const hoursVal = hours || 24;
            const heartbeats = Heartbeat.getRecentByMonitorIds(Database.db, [monitor_id], hoursVal);

            const scoreData = heartbeats.map(h => ({
                time: h.time,
                score: ScoreEngine.calculate(h, monitor),
            }));

            callback({ ok: true, data: scoreData });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });
}

module.exports = { chartSocketHandler };
