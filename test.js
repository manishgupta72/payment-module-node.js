
const pool = require('./config/db.js')
async function testDB() {
  try {
    const res = await pool.query('SELECT * from users');
    console.log('DB Time:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

testDB();