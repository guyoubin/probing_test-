const path = require("path");
const Database = require("better-sqlite3");
const knex = require("knex");
const config = require("./config");

let db = null;
let knexInstance = null;

function connect() {
    const dbPath = path.join(config.dataDir, "cyberprobe.db");

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("foreign_keys = ON");

    knexInstance = knex({
        client: "better-sqlite3",
        connection: {
            filename: dbPath,
        },
        useNullAsDefault: true,
        migrations: {
            directory: path.join(__dirname, "..", "db", "knex_migrations"),
        },
    });

    console.log(`Database connected: ${dbPath}`);
}

async function patch() {
    if (!knexInstance) {
        throw new Error("Database not connected. Call connect() first.");
    }
    const [batchNo, log] = await knexInstance.migrate.latest();
    if (log.length > 0) {
        console.log(`Migrations applied (batch ${batchNo}):`, log);
    } else {
        console.log("No pending migrations.");
    }
}

module.exports = {
    get db() {
        return db;
    },
    get knex() {
        return knexInstance;
    },
    connect,
    patch,
};
