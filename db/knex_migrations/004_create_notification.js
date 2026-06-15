/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable("notification", (table) => {
            table.increments("id").primary();
            table.integer("user_id").unsigned().notNullable();
            table.foreign("user_id").references("user.id");
            table.text("name").notNullable();
            table.text("type").notNullable();
            table.text("config_json").nullable();
            table.integer("is_default").defaultTo(0);
            table.integer("active").defaultTo(1);
        })
        .createTable("monitor_notification", (table) => {
            table.integer("monitor_id").unsigned().notNullable();
            table.foreign("monitor_id").references("monitor.id");
            table.integer("notification_id").unsigned().notNullable();
            table.foreign("notification_id").references("notification.id");
            table.primary(["monitor_id", "notification_id"]);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists("monitor_notification")
        .dropTableIfExists("notification");
};
