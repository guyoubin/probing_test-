/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable("tag", (table) => {
            table.increments("id").primary();
            table.text("name").notNullable().unique();
            table.text("color").defaultTo("#00F0FF");
        })
        .createTable("monitor_tag", (table) => {
            table.integer("tag_id").unsigned().notNullable();
            table.foreign("tag_id").references("tag.id");
            table.integer("monitor_id").unsigned().notNullable();
            table.foreign("monitor_id").references("monitor.id");
            table.text("value").nullable();
            table.primary(["tag_id", "monitor_id"]);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists("monitor_tag")
        .dropTableIfExists("tag");
};
