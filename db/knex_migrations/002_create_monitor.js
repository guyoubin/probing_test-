/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("monitor", (table) => {
        table.increments("id").primary();
        table.integer("user_id").unsigned().notNullable();
        table.foreign("user_id").references("user.id");
        table.text("name").notNullable();
        table.text("description").nullable();
        table.text("type").notNullable();
        table.text("layer").nullable();
        table.integer("active").defaultTo(1);
        table.integer("interval").defaultTo(60);
        table.integer("retry_interval").defaultTo(60);
        table.integer("max_retries").defaultTo(3);
        table.integer("resend_interval").defaultTo(0);
        table.integer("parent").nullable();
        table.text("hostname").nullable();
        table.integer("port").nullable();
        table.text("url").nullable();
        table.text("method").defaultTo("GET");
        table.text("headers_json").nullable();
        table.text("body").nullable();
        table.text("dns_resolve_type").defaultTo("A");
        table.text("dns_resolve_server").nullable();
        table.integer("timeout").defaultTo(5000);
        table.text("api_key").nullable();
        table.text("api_model").nullable();
        table.text("stream_prompt").nullable();
        table.integer("max_hops").defaultTo(30);
        table.integer("bandwidth_duration").defaultTo(10);
        table.integer("bandwidth_connections").defaultTo(4);
        table.text("accepted_statuscodes_json").nullable();
        table.integer("upside_down").defaultTo(0);
        table.integer("packet_size").defaultTo(64);
        table.integer("ping_count").defaultTo(10);
        table.integer("cert_expiry_notification").defaultTo(1);
        table.integer("domain_expiry_notification").defaultTo(0);
        table.text("assigned_node_ids_json").nullable();
        table.datetime("created_at").nullable();
        table.datetime("updated_at").nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("monitor");
};
