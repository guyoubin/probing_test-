/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("report", (table) => {
        table.increments("id").primary();
        table.integer("user_id").unsigned().notNullable();
        table.foreign("user_id").references("user.id");
        table.text("name").nullable();
        table.text("suite_type").nullable();
        table.text("monitor_ids_json").nullable();
        table.text("node_ids_json").nullable();
        table.datetime("start_time").nullable();
        table.datetime("end_time").nullable();
        table.text("status").defaultTo("generating");
        table.text("format").defaultTo("html");
        table.text("file_path").nullable();
        table.float("composite_score").nullable();
        table.text("summary_json").nullable();
        table.datetime("created_at").nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("report");
};
