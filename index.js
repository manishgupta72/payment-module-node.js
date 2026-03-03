require("dotenv").config();
const express = require("express");

const userRoutes = require('./routes/user.routes.js');

const app = express();

const PORT = process.env.PORT || 4000;
app.use(express.json());


app.get("/", (req, res) => {
  return res.send(`hello manish `);
});

app.use('api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`Server started at PORT ${PORT}`);
});
