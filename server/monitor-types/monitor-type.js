// 抽象基类，所有monitor type继承此类
class MonitorType {
    name = undefined;  // 唯一标识符
    layer = undefined;  // L1/L2/L3/L4
    description = undefined;

    async check(monitor, heartbeat, server) {
        throw new Error("Must override check()");
    }
}
module.exports = { MonitorType };
