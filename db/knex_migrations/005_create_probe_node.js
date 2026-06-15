/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("probe_node", (table) => {
        table.increments("id").primary();
        table.text("name").notNullable();
        table.text("hostname").nullable();
        table.text("region").nullable();
        table.float("latitude").nullable();
        table.float("longitude").nullable();
        table.text("status").defaultTo("unknown");
        table.datetime("last_heartbeat").nullable();
        table.text("capabilities_json").nullable();
        table.text("api_key").nullable();
        table.datetime("created_at").nullable();
        table.text("custom_labels_json").nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("probe_node");
};
