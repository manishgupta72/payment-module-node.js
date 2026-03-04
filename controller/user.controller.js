const pool = require("../config/db.js");
const bcrypt = require("bcrypt");
const {
  registerSchema,
  loginSchema,
} = require("../validation/user.validation.js");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../service/auth.service.js");

// Cookie config in one place — easy to update for production
// const ACCESS_COOKIE_OPTIONS = {
//   httpOnly: true,
//   sameSite: "strict",
//   secure: true,
//   path: "/",
//   maxAge: 15 * 60 * 1000, // 15 minutes
// };

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: true, //true in production
  path: "/api/users/refresh", // browser ONLY sends this cookie to this exact path
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function createUser(req, res) {
  try {
    // const { email, password, role } = req.body;

    //used zod validation here
    const parsed = registerSchema.safeParse(req.body);
    //if any error then return error message
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0].message,
      });
    }

    const { email, password, role } = parsed.data;

    //Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO users (email,password,role)
                       VALUES($1,$2,$3)
                       RETURNING id,email,role,created_at
                        `;
    const values = [email, hashedPassword, role];
    const result = await pool.query(query, values);

    return res
      .status(201)
      .json({ messages: "User created successfully", user: result.rows[0] });
  } catch (err) {
    //UNIQUE violation
    if (err.code === "23505" && err.constraint == "users_email_key") {
      return res.status(400).json({
        message: "Email already exists",
      });
    }
    // not send error message to client , attackers learn from that
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function loginUser(req, res) {
  try {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;

    const parsed = loginSchema.safeParse(req.body);

    //if any error then return error message
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0].message,
      });
    }

    const { email, password } = parsed.data;

    const query = `
        select id,password,role,is_active
        from users
        where email = $1
        limit 1
        `;
    const result = await pool.query(query, [email]);
    // console.log("result=", result);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }
    const isMatchedPassword = await bcrypt.compare(password, user.password);
    if (!isMatchedPassword) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }
    if (!user.is_active) {
      return res.status(403).json({
        message: "Account is disabled",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const hashedRefresheToken = hashToken(refreshToken);
    // console.log(isMatchedPassword);
    await pool.query(
      ` INSERT INTO sessions(user_id,refresh_token,expires_at,user_agent,ip_address)
         values($1,$2,NOW() + INTERVAL '7 days',$3,$4)
         `,
      [user.id, hashedRefresheToken, userAgent, ip],
    );

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      message: "Login successfully",
      accessToken,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

async function refreshToken(req, res) {
  try {
    const userAgent = req.headers["user-agent"];
    const ip = req.ip || req.connection.remoteAddress;

    const token = req.cookies?.refreshToken;
    // console.log("token", token);
    if (!token) {
      return res.status(401).json({ message: "no refresh token provided" });
    }
    // Step 1 - verify JWT signature and expiry
    const decoded = verifyRefreshToken(token);
    // console.log("decoded", decoded);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "invalid or expired refresh token" });
    }
    const hashedRefresheToken = hashToken(token);
    // Step 2 - check token exists in DB (was not already rotated or revoked)
    const query = `
            select user_id ,  expires_at , is_revoked
             from sessions
             where refresh_token=$1
             limit 1;
      `;
    const result = await pool.query(query, [hashedRefresheToken]);
    const session = result.rows[0];

    if (!session) {
      return res.status(401).json({
        message: "Session not found",
      });
    }
    if (session.is_revoked) {
      return res.status(401).json({
        message: "Session revoked",
      });
    }
    if (session.user_id !== decoded.id) {
      return res.status(401).json({
        message: "Invalid session",
      });
    }

    //optional expiry check
    if (session.expires_at < new Date()) {
      return res.status(401).json({
        message: "Refresh token expired",
      });
    }
    //Rotate Token (delete old sessions)
    const updateQuery = `
      update  sessions
      SET is_revoked=true,
      revoked_at = now()
      where refresh_token=$1
      `;
    const updated = await pool.query(updateQuery, [hashedRefresheToken]);
    console.log(updated);
    if (updated.rowCount === 0) {
      return res.status(401).json({
        message: "invalid session",
      });
    }

    const userQuery = `
        select id,role,is_active
        from users
        where id = $1
        limit 1
        `;
    const userResult = await pool.query(userQuery, [decoded.id]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({
        message: "invalid credentials",
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newHashRefreshToken = hashToken(newRefreshToken);
    await pool.query(
      ` INSERT INTO sessions(user_id,refresh_token,expires_at,user_agent,ip_address)
         values($1,$2,NOW() + INTERVAL '7 days',$3,$4)
         `,
      [user.id, newHashRefreshToken, userAgent, ip],
    );

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    return res.status(500).json({ message: "internal server error" });
  }
}

async function logout(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const decoded = verifyRefreshToken(token);
      const hashedToken = hashToken(token);
      if (decoded) {
        const query = `
                UPDATE sessions
                set is_revoked = true,
                revoked_at = now()
                where refresh_token=$1
                `;
        await pool.query(query, [hashedToken]);
      }
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(500).json({
      message: "internal server error",
    });
  }
}

module.exports = {
  createUser,
  loginUser,
  refreshToken,
  logout,
};
