import express from "express";
import jwt from "express-jwt";
import jwks from "jwks-rsa";
import path from "path";
import multer from "multer";
import DB from "../db.js";
import ENIGMA from "../enigma.js";
import Task from "../models/Task.js";
import Stat from "../models/Stat.js";
import fs from "fs";
import Submission from "../models/Submission.js";

const __dirname = path.resolve();
const DBSOURCE = path.resolve(__dirname, "./db.sqlite3");
const assetspath = path.resolve(__dirname + "/app/assets/img/submissions");

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
Stat.setConnection(DB.connect());

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    var acceptable = ["image/jpeg", "image/png"];
    var uploadloc = assetspath;
    if (acceptable.includes(file.mimetype)) {
      callback(null, uploadloc);
    } else {
      callback({ error: "Invalid file type" }, null);
    }
  },
  filename: function (req, file, callback) {
    var [fname, ext] = file.originalname.split(".");
    var name = "";
    ENIGMA.genkey(req.params.KEY, fname)
      .then((k) => {
        name =
          k +
          "_" +
          fname +
          "_" +
          req.params.TASKID +
          "_" +
          Date.now() +
          "." +
          ext;
        callback(null, name);
      })
      .catch((err) => {
        callback({ error: err.message }, null);
      });
  },
});

const upload = multer({
  storage: storage,
});

const route = express.Router();
route.use(jwtCheck);

//FOR STATS VIEW WITH STUDENT KEY
route.get("/:KEY", (req, res) => {
  Stat.get({ key: req.params.KEY })
    .then((stats) => {
      res.json({
        status: "Success",
        stats: stats,
      });
    })
    .catch((err) => res.json(err));
});

//FOR STATS VIEW WITH STUDENT KEY AND TASKID
route.get("/:KEY/:TASKID", (req, res) => {
  Stat.get({ key: req.params.KEY, taskid: req.params.TASKID })
    .then((stats) => {
      res.json({
        status: "Success",
        stats: stats,
      });
    })
    .catch((err) => res.json(err));
});

export default route;
