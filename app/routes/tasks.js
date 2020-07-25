import express from "express";
import jwt from "express-jwt";
import jwks from "jwks-rsa";
import DB from "../db.js";
import Task from "../models/Task.js";
import path from "path";
import bodyParser from "body-parser";
import multer from "multer";
import ENIGMA from "../enigma.js";
import fs from "fs";
const __dirname = path.resolve();
const DBSOURCE = path.resolve(__dirname, "./db.sqlite3");
const assetspath = path.resolve(__dirname + "/app/assets/img");
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
Task.setConnection(DB.connect());
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
        name = k + "_" + fname + "_." + ext;
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
route.get("/:TASKID", (req, res) => {
  Task.get({ id: req.params.TASKID })
    .then((task) => {
      var files = [];
      if (task.attachments != "") {
        for (var file of task.attachments.split(",")) {
          files.push("http://" + req.hostname + ":" + port + file);
        }
      }
      task.attachments = files;
      res.json(task);
    })
    .catch((err) => {
      res.json(err);
    });
});

route.post("/create/:KEY", upload.array(["attachments"]), (req, res) => {
  var taskdata = req.body;
  taskdata.key = req.params.KEY;
  var files = [];
  for (var file of req.files) {
    files.push("/uploads/img/" + file.filename);
  }
  taskdata.attachments = files.join(",");
  Task.create(taskdata)
    .then((task) => {
      res.json(task);
    })
    .catch((err) => {
      for (var file of req.files) {
        fs.unlinkSync(file.path);
      }
      res.json(err);
    });
});

route.patch(
  "/update/:KEY/:TASKID",
  upload.array(["attachments"]),
  (req, res) => {
    var taskdata = req.body;
    taskdata.key = req.params.KEY;
    taskdata.id = req.params.TASKID;
    var files = [];
    for (var file of req.files) {
      files.push("/uploads/img/" + file.filename);
    }
    taskdata.attachments = files.join(",");
    Task.update(taskdata)
      .then((task) => {
        var files = [];
        for (var file of task.task.attachments.split(",")) {
          files.push("http://" + req.hostname + ":" + port + file);
        }
        task.task.attachments = files;
        res.json(task);
      })
      .catch((err) => {
        for (var file of req.files) {
          fs.unlinkSync(file.path);
        }
        res.json(err);
      });
  }
);

route.delete("/delete/:KEY/:TASKID", (req, res) => {
  Task.delete({ id: req.params.TASKID, key: req.params.KEY })
    .then((msg) => {
      for (var file of msg.tobedeleted) {
        file = path.resolve(file.replace("/uploads/img", assetspath));
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      res.json({
        success: msg.success,
        deleted: msg.deleted,
      });
    })
    .catch((err) => {
      res.json(err);
    });
});

export default route;
