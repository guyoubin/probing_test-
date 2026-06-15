/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("heartbeat", (table) => {
        table.increments("id").primary();
        table.integer("monitor_id").unsigned().notNullable();
        table.foreign("monitor_id").references("monitor.id");
        table.integer("status").defaultTo(0);
        table.datetime("time").notNullable();
        table.datetime("end_time").nullable();
        table.float("ping").nullable();
        table.text("msg").nullable();
        table.integer("important").defaultTo(0);
        table.integer("down_count").defaultTo(0);
        table.integer("retries").defaultTo(0);
        table.integer("probe_node_id").nullable();
        table.float("ttfb_ms").nullable();
        table.float("ttlb_ms").nullable();
        table.float("ttft_ms").nullable();
        table.float("tokens_per_second").nullable();
        table.float("packet_loss_rate").nullable();
        table.float("jitter_ms").nullable();
        table.integer("cert_days_remaining").nullable();
        table.text("dns_consistency").nullable();
        table.integer("route_hop_count").nullable();
        table.text("route_as_path_json").nullable();
        table.float("download_rate_mbps").nullable();
        table.float("business_pass_rate").nullable();
        table.float("composite_score").nullable();
        table.text("raw_result_json").nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("heartbeat");
};
