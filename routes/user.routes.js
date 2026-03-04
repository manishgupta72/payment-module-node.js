const router = require("express").Router();
const {
  createUser,
  loginUser,
  refreshToken,
  logout,
} = require("../controller/user.controller.js");

router.post("/", createUser);
router.post("/login", loginUser);

router.post("/refresh", refreshToken);
router.get("/logout", logout);

module.exports = router;
