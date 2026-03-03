const pool = require('../config/db.js');
const bcrypt = require('bcrypt')


async function createUser(req, res) {

    try {
        const { email, password, role } = req.body;

        //Hash Password
        const hashedPassword = await bcrypt.hash(password);

        const query = `INSERT INTO users (email,password,role)
                       VALUES($1,$2,$3)
                       RETURNING id,email,role,created_at
                        `;
        const values = [email, hashedPassword, role];
        const result = await pool.query(query, values);

        return res.status(201).json({ messages: "User created successfully", user: result.rows[0] });

    } catch (err) {
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }

}

module.exports = {
    createUser
}