import fs from "fs";
import path from "path";
import express from "express";
import DB from "./app/db.js";
import USER from "./app/routes/user.js";
import submissionRoute from "./app/routes/submission.js";
const app = express();
var db = new DB("./db.sqlite3", "db", "shri", "pass");
const __dirname = path.resolve();
//import other routes
app.use("/users", USER.usersRoute);
app.use("/tasks", USER.usersRoute);
app.use("/user", USER.userRoute);
app.use("/submissions", submissionRoute);
app.use("/stats", USER.usersRoute);
app.use("/uploads", express.static(path.resolve(__dirname + "/app/assets/")));

//route
app.get("/", (req, res) => {
  res.send("hell");
});

app.listen(3000, () => {
  console.log("Server is listening at http://127.0.0.1:3000");
});
