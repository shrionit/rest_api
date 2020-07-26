import express from "express";
import jwt from "express-jwt";
import jwks from "jwks-rsa";
import DB from "../db.js";
import User from "../models/User.js";
import path from "path";
import bodyParser from "body-parser";
import task from "./tasks.js";
import submission from "./submission.js";
import statsroute from "./stats.js";

var [tasks, taskview] = Object.values(task);
var [studentsub, instructorsub] = Object.values(submission);
const __dirname = path.resolve();
const DBSOURCE = path.resolve(__dirname, "./db.sqlite3");

//helpers
function checkInt(n) {
  return n == parseInt(n, 10);
}
//-------

//auth
var port = process.env.PORT || 3000;

var jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: "https://dev-vlison11.eu.auth0.com/.well-known/jwks.json",
  }),
  audience: "http://localhost:3000/",
  issuer: "https://dev-vlison11.eu.auth0.com/",
  algorithms: ["RS256"],
});

const db = new DB(DBSOURCE);
User.setConnection(DB.connect());

const users = express.Router();
users.use(bodyParser.json());
users.use(jwtCheck);
users.get("/", (req, res) => {
  var out = {
    Use: "/students or /instructors",
  };
  res.json(out);
});

//LIST OF STUDENTS
users.get("/students", (req, res) => {
  User.get({})
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

//STUDENT WITH ID OR USERNAME
users.get("/students/:ID", (req, res) => {
  var filter = {};
  if (checkInt(req.params.ID)) {
    filter.id = req.params.ID;
  } else {
    filter.username = req.params.ID;
  }
  User.get(filter)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

/*-----------------------------------------------------------------------------*/

//LIST OF INSTRUCTORS
users.get("/instructors", (req, res) => {
  User.get({ tutor: true })
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

//INSTRUCTOR WITH ID OR USERNAME
users.get("/instructors/:ID", (req, res) => {
  var filter = {
    tutor: true,
  };
  if (checkInt(req.params.ID)) {
    filter.ID = req.params.ID;
  } else {
    filter.username = req.params.ID;
  }
  User.get(filter)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

/* ===================================================================*/

//Individual Users
const user = express.Router();
user.use(bodyParser.json());
user.get("/", (req, res) => {
  const out = {
    info: "use your type ['']",
  };
  res.send(out);
});
user.post("/getaccess", (req, res) => {
  User.login(req.body)
    .then((out) => {
      res.json(out);
    })
    .catch((err) => {
      res.json(err);
    });
});

user.use(jwtCheck);
user.post("/create", (req, res) => {
  User.create(req.body)
    .then((out) => {
      res.json(out);
    })
    .catch((err) => {
      res.json(err);
    });
});

//tasks route for instructors
user.use("/instructor/task", tasks);

//tasks route for students
user.use("/tasks", taskview);

//submissions route for instructors
user.use("/instructor/submissions", instructorsub);

//tasks route for students
user.use("/submission", studentsub);

//stas route for studens
user.use("/stats", statsroute);

export default {
  usersRoute: users,
  userRoute: user,
};
