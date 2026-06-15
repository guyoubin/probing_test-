/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("user", (table) => {
        table.increments("id").primary();
        table.text("username").notNullable().unique();
        table.text("password").notNullable();
        table.integer("active").defaultTo(1);
        table.integer("twofa_status").defaultTo(0);
        table.text("twofa_secret").nullable();
        table.datetime("created_at").defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("user");
};
