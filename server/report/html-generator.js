const dayjs = require("dayjs");

/**
 * Generate a cyberpunk-themed standalone HTML report
 * @param {object} params
 * @param {string} params.title - Report title
 * @param {Array} params.monitors - Monitor records
 * @param {Array} params.heartbeats - Heartbeat records
 * @param {Array} params.scores - Score records [{monitor_id, score}]
 * @param {string} params.timestamp - Generation timestamp
 * @returns {string} Complete HTML string
 */
function generateHTML({ title, monitors, heartbeats, scores, timestamp }) {
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;
    const upCount = heartbeats.filter(h => h.status === 1).length;
    const downCount = heartbeats.filter(h => h.status === 0).length;
    const totalChecks = heartbeats.length;
    const uptimePercent = totalChecks > 0 ? ((upCount / totalChecks) * 100).toFixed(2) : "0.00";

    const scoreColor = avgScore >= 80 ? "#00F0FF" : avgScore >= 50 ? "#FFD600" : "#FF0055";
    const uptimeColor = parseFloat(uptimePercent) >= 99 ? "#00F0FF" : parseFloat(uptimePercent) >= 95 ? "#FFD600" : "#FF0055";

    const monitorRows = monitors.map(m => {
        const hbs = heartbeats.filter(h => h.monitor_id === m.id);
        const sc = scores.find(s => s.monitor_id === m.id);
        const scoreVal = sc ? sc.score : 0;
        const lastHb = hbs.length > 0 ? hbs[hbs.length - 1] : null;
        const statusClass = lastHb ? (lastHb.status === 1 ? "status-up" : "status-down") : "status-pending";
        const statusText = lastHb ? (lastHb.status === 1 ? "UP" : "DOWN") : "PENDING";

        return `
            <tr>
                <td class="mon-name">${escapeHtml(m.name)}</td>
                <td><span class="type-badge">${escapeHtml(m.type)}</span></td>
                <td class="${statusClass}">${statusText}</td>
                <td>${lastHb ? (lastHb.ping || "N/A") : "N/A"}</td>
                <td>${hbs.length}</td>
                <td class="score-cell" style="color: ${scoreVal >= 80 ? '#00F0FF' : scoreVal >= 50 ? '#FFD600' : '#FF0055'}">${scoreVal}</td>
                <td>${lastHb ? lastHb.time : "N/A"}</td>
                <td class="msg-cell">${lastHb ? escapeHtml(lastHb.msg || "") : ""}</td>
            </tr>`;
    }).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} - CyberProbe Report</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
        background: #0A0A0F;
        color: #C0C0D0;
        font-family: 'Share Tech Mono', monospace;
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
    }

    body::before {
        content: '';
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background:
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.015) 2px, rgba(0, 240, 255, 0.015) 4px),
            radial-gradient(ellipse at 20% 50%, rgba(255, 0, 85, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(0, 240, 255, 0.06) 0%, transparent 60%);
        pointer-events: none;
        z-index: 0;
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 40px 20px;
        position: relative;
        z-index: 1;
    }

    .header {
        text-align: center;
        margin-bottom: 50px;
        border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        padding-bottom: 30px;
    }

    .header h1 {
        font-family: 'Orbitron', sans-serif;
        font-size: 2.5em;
        font-weight: 900;
        background: linear-gradient(135deg, #FF0055, #00F0FF);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 4px;
        text-transform: uppercase;
        margin-bottom: 10px;
    }

    .header .subtitle {
        font-size: 0.9em;
        color: #6070A0;
        letter-spacing: 2px;
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-bottom: 50px;
    }

    .summary-card {
        background: rgba(10, 10, 20, 0.8);
        border: 1px solid rgba(0, 240, 255, 0.15);
        border-radius: 8px;
        padding: 25px;
        text-align: center;
        position: relative;
        overflow: hidden;
    }

    .summary-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #00F0FF, transparent);
    }

    .summary-card .label {
        font-size: 0.75em;
        color: #6070A0;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 10px;
    }

    .summary-card .value {
        font-family: 'Orbitron', sans-serif;
        font-size: 2em;
        font-weight: 700;
    }

    .score-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        margin-top: 12px;
        overflow: hidden;
    }

    .score-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
    }

    .section-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 1.2em;
        color: #00F0FF;
        letter-spacing: 3px;
        text-transform: uppercase;
        margin-bottom: 20px;
        padding-left: 15px;
        border-left: 3px solid #FF0055;
    }

    .table-wrapper {
        overflow-x: auto;
        margin-bottom: 40px;
        border: 1px solid rgba(0, 240, 255, 0.1);
        border-radius: 8px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85em;
    }

    thead {
        background: rgba(0, 240, 255, 0.05);
    }

    th {
        padding: 14px 16px;
        text-align: left;
        color: #00F0FF;
        font-weight: 400;
        letter-spacing: 1px;
        text-transform: uppercase;
        font-size: 0.85em;
        border-bottom: 1px solid rgba(0, 240, 255, 0.15);
    }

    td {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    tbody tr:hover {
        background: rgba(0, 240, 255, 0.03);
    }

    .mon-name { color: #E0E0F0; font-weight: bold; }
    .status-up { color: #00F0FF; font-weight: bold; }
    .status-down { color: #FF0055; font-weight: bold; }
    .status-pending { color: #FFD600; font-weight: bold; }

    .type-badge {
        display: inline-block;
        padding: 2px 8px;
        background: rgba(0, 240, 255, 0.1);
        border: 1px solid rgba(0, 240, 255, 0.2);
        border-radius: 3px;
        font-size: 0.85em;
        color: #80D0FF;
    }

    .score-cell {
        font-family: 'Orbitron', sans-serif;
        font-weight: 700;
    }

    .msg-cell {
        max-width: 250px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #7080A0;
    }

    .footer {
        text-align: center;
        color: #4050A0;
        font-size: 0.75em;
        letter-spacing: 1px;
        padding: 30px 0;
        border-top: 1px solid rgba(0, 240, 255, 0.1);
    }

    @media (max-width: 768px) {
        .header h1 { font-size: 1.5em; }
        .summary-card .value { font-size: 1.5em; }
    }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">Generated: ${escapeHtml(timestamp || dayjs().format("YYYY-MM-DD HH:mm:ss"))} | CyberProbe Monitoring System</div>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="label">Composite Score</div>
            <div class="value" style="color: ${scoreColor}">${avgScore}</div>
            <div class="score-bar">
                <div class="score-bar-fill" style="width: ${avgScore}%; background: ${scoreColor}"></div>
            </div>
        </div>
        <div class="summary-card">
            <div class="label">Uptime</div>
            <div class="value" style="color: ${uptimeColor}">${uptimePercent}%</div>
            <div class="score-bar">
                <div class="score-bar-fill" style="width: ${uptimePercent}%; background: ${uptimeColor}"></div>
            </div>
        </div>
        <div class="summary-card">
            <div class="label">Monitors</div>
            <div class="value" style="color: #00F0FF">${monitors.length}</div>
        </div>
        <div class="summary-card">
            <div class="label">Total Checks</div>
            <div class="value" style="color: #00F0FF">${totalChecks}</div>
        </div>
        <div class="summary-card">
            <div class="label">Up / Down</div>
            <div class="value"><span class="status-up">${upCount}</span> / <span class="status-down">${downCount}</span></div>
        </div>
    </div>

    <h2 class="section-title">Monitor Details</h2>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Ping (ms)</th>
                    <th>Checks</th>
                    <th>Score</th>
                    <th>Last Check</th>
                    <th>Message</th>
                </tr>
            </thead>
            <tbody>
                ${monitorRows || '<tr><td colspan="8" style="text-align:center;color:#6070A0">No monitors</td></tr>'}
            </tbody>
        </table>
    </div>

    <div class="footer">
        CyberProbe Monitoring System &copy; ${dayjs().year()} | Report ID: ${Date.now().toString(36).toUpperCase()}
    </div>
</div>
</body>
</html>`;
}

function escapeHtml(str) {
    if (typeof str !== "string") return String(str || "");
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = { generateHTML };
