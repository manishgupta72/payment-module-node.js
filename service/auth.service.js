const jwt = require("jsonwebtoken");
const crypto = require("crypto");

//SHA-256 hash of token refresh token - raw token is never stored in db
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

//short lived : 15minutes- stateless , no db hit on every api request
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );
}
// Long-lived: 7 days — rotated (deleted + new one issued) on every refresh call
function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
}
// Returns decoded payload if valid, null if expired or tampered
function verifyAccessToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}
// Returns decoded payload if valid, null if expired or tampered
function verifyRefreshToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
