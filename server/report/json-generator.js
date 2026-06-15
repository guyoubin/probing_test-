const dayjs = require("dayjs");

/**
 * Generate a structured JSON report
 * @param {object} params
 * @param {string} params.title - Report title
 * @param {Array} params.monitors - Monitor records
 * @param {Array} params.heartbeats - Heartbeat records
 * @param {Array} params.scores - Score records [{monitor_id, score, subscores}]
 * @param {string} params.timestamp - Generation timestamp
 * @returns {object} Structured report object
 */
function generateJSON({ title, monitors, heartbeats, scores, timestamp }) {
    const upCount = heartbeats.filter(h => h.status === 1).length;
    const downCount = heartbeats.filter(h => h.status === 0).length;
    const totalChecks = heartbeats.length;
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    const summary = {
        title,
        timestamp: timestamp || dayjs().format("YYYY-MM-DD HH:mm:ss"),
        total_monitors: monitors.length,
        total_checks: totalChecks,
        up_count: upCount,
        down_count: downCount,
        uptime_percent: totalChecks > 0 ? parseFloat(((upCount / totalChecks) * 100).toFixed(2)) : 0,
        composite_score: avgScore,
    };

    const monitorDetails = monitors.map(m => {
        const monitorHeartbeats = heartbeats.filter(h => h.monitor_id === m.id);
        const scoreData = scores.find(s => s.monitor_id === m.id);
        const lastHb = monitorHeartbeats.length > 0 ? monitorHeartbeats[monitorHeartbeats.length - 1] : null;
        const monitorUpCount = monitorHeartbeats.filter(h => h.status === 1).length;

        return {
            id: m.id,
            name: m.name,
            type: m.type,
            status: lastHb ? (lastHb.status === 1 ? "up" : "down") : "pending",
            score: scoreData ? scoreData.score : null,
            subscores: scoreData ? scoreData.subscores : null,
            check_count: monitorHeartbeats.length,
            uptime_percent: monitorHeartbeats.length > 0
                ? parseFloat(((monitorUpCount / monitorHeartbeats.length) * 100).toFixed(2))
                : 0,
            last_check: lastHb ? {
                time: lastHb.time,
                status: lastHb.status === 1 ? "up" : "down",
                ping: lastHb.ping,
                msg: lastHb.msg,
            } : null,
            heartbeats: monitorHeartbeats.map(h => ({
                time: h.time,
                status: h.status === 1 ? "up" : "down",
                ping: h.ping,
                msg: h.msg,
            })),
        };
    });

    return {
        summary,
        monitors: monitorDetails,
    };
}

module.exports = { generateJSON };
