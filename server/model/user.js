const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;

class User {
    constructor(row) {
        this.id = row.id;
        this.username = row.username;
        this.password = row.password;
        this.active = row.active;
        this.twofa_status = row.twofa_status;
        this.twofa_secret = row.twofa_secret;
        this.created_at = row.created_at;
    }

    static async hashPassword(password) {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    static async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    generateJWT(secret, expiresIn) {
        return jwt.sign(
            { id: this.id, username: this.username },
            secret,
            { expiresIn }
        );
    }

    static verifyJWT(token, secret) {
        return jwt.verify(token, secret);
    }

    static async findByUsername(db, username) {
        const row = db.prepare("SELECT * FROM user WHERE username = ?").get(username);
        return row ? new User(row) : null;
    }

    static async findById(db, id) {
        const row = db.prepare("SELECT * FROM user WHERE id = ?").get(id);
        return row ? new User(row) : null;
    }

    static async create(db, username, password) {
        const hashed = await User.hashPassword(password);
        const result = db
            .prepare("INSERT INTO user (username, password) VALUES (?, ?)")
            .run(username, hashed);
        return User.findById(db, result.lastInsertRowid);
    }
}

module.exports = User;
