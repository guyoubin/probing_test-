const path = require("path");
const knex = require("knex");

const knexInstance = knex({
    client: "better-sqlite3",
    connection: {
        filename: path.resolve(__dirname, "..", "data", "cyberprobe.db"),
    },
    useNullAsDefault: true,
    migrations: {
        directory: path.join(__dirname, "knex_migrations"),
    },
});

knexInstance
    .migrate
    .latest()
    .then(([batchNo, log]) => {
        if (log.length > 0) {
            console.log(`Migrations applied (batch ${batchNo}):`, log);
        } else {
            console.log("No pending migrations.");
        }
        process.exit(0);
    })
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
