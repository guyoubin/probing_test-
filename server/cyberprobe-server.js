const Monitor = require("./model/monitor");
const Database = require("./database");

let instance = null;

class CyberProbeServer {
    constructor() {
        this.io = null;
        this.app = null;
        this.monitorTypeList = {};
        this.monitorList = {};
        this.probeNodeList = {};
        this._backgroundJobs = [];
    }

    static getInstance() {
        if (!instance) {
            instance = new CyberProbeServer();
        }
        return instance;
    }

    registerMonitorType(type, monitorTypeModule) {
        this.monitorTypeList[type] = monitorTypeModule;
    }

    async initAfterDatabaseReady() {
        // Register built-in monitor types
        this._registerBuiltinMonitorTypes();

        // Load active monitors from DB
        await this._loadActiveMonitors();

        // Start beat loops for all active monitors
        this._startAllBeatLoops();

        // Start background jobs
        this._startBackgroundJobs();

        console.log(
            `CyberProbeServer initialized: ${Object.keys(this.monitorList).length} monitors, ` +
            `${Object.keys(this.monitorTypeList).length} monitor types`
        );
    }

    _registerBuiltinMonitorTypes() {
        const fs = require("fs");
        const path = require("path");
        const typesDir = path.join(__dirname, "monitor-types");

        if (fs.existsSync(typesDir)) {
            const files = fs.readdirSync(typesDir).filter((f) => f.endsWith(".js") && f !== "monitor-type.js");
            for (const file of files) {
                try {
                    const mod = require(path.join(typesDir, file));
                    // 查找导出的类（继承自 MonitorType）
                    const Class = mod[Object.keys(mod).find(k => {
                        try { return typeof mod[k] === "function" && mod[k].prototype && mod[k].prototype.check; } catch(e) { return false; }
                    })];
                    if (Class) {
                        const instance = new Class();
                        if (instance.name) {
                            this.monitorTypeList[instance.name] = instance;
                            console.log(`Registered monitor type: ${instance.name} (${instance.layer})`);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to load monitor type ${file}:`, err.message);
                }
            }
        }
    }

    async _loadActiveMonitors() {
        const db = Database.db;
        const rows = db.prepare("SELECT * FROM monitor WHERE active = 1").all();
        for (const row of rows) {
            const monitor = new Monitor(row);
            this.monitorList[monitor.id] = monitor;
        }
    }

    _startAllBeatLoops() {
        for (const [id, monitor] of Object.entries(this.monitorList)) {
            if (monitor.active && this.io) {
                monitor.start(this.io);
                console.log(`Started beat loop for monitor #${id} (${monitor.name})`);
            }
        }
    }

    _startBackgroundJobs() {
        // Placeholder for background jobs like cleanup, report generation, etc.
        // These can be extended later
        console.log("Background jobs initialized");
    }

    addMonitor(monitor) {
        this.monitorList[monitor.id] = monitor;
        if (monitor.active && this.io) {
            monitor.start(this.io);
        }
    }

    removeMonitor(id) {
        const monitor = this.monitorList[id];
        if (monitor) {
            monitor.stop();
            delete this.monitorList[id];
        }
    }

    restartMonitor(id) {
        const monitor = this.monitorList[id];
        if (monitor) {
            monitor.stop();
            if (monitor.active && this.io) {
                monitor.start(this.io);
            }
        }
    }
}

module.exports = CyberProbeServer;
