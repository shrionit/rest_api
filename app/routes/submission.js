import express from "express";
import jwt from "express-jwt";
import jwks from "jwks-rsa";
import path from "path";
import multer from "multer";
import DB from "../db.js";
import ENIGMA from "../enigma.js";
import Task from "../models/Task.js";
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
Submission.setConnection(DB.connect());

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

//FOR STUDENT VIEW OF SUBMISSION WITH STUDENT KEY
route.get("/:KEY", (req, res) => {
  var subdata = {
    key: req.params.KEY,
    student: true,
  };
  Submission.get(subdata)
    .then((data) => {
      for (var sub of data) {
        var files = [];
        if (sub.submission_files != "") {
          for (var file of sub.submission_files.split(",")) {
            files.push("http://" + req.hostname + ":" + port + file);
          }
        }
        sub.submission_files = files;
      }
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

//FOR STUDENT VIEW OF A PERTICULAR SUBMISSION WITH STUDENT KEY AND SUBID
route.get("/:KEY/:SUBID", (req, res) => {
  var subdata = {
    id: req.params.SUBID,
    key: req.params.KEY,
    student: true,
  };
  Submission.get(subdata)
    .then((data) => {
      for (var sub of data) {
        var files = [];
        if (sub.submission_files != "") {
          for (var file of sub.submission_files.split(",")) {
            files.push("http://" + req.hostname + ":" + port + file);
          }
        }
        sub.submission_files = files;
      }
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

route.post(
  "/submit/:KEY/:TASKID",
  upload.array(["attachments"]),
  (req, res) => {
    var attachments = [];
    for (var file of req.files) {
      attachments.push("/uploads/img/submissions/" + file.filename);
    }
    attachments = attachments.join(",");
    console.log(attachments);
    var subdata = {
      id: req.params.TASKID,
      key: req.params.KEY,
      submission_files: attachments,
    };
    Submission.create(subdata)
      .then((data) => {
        res.json({
          status: "Success",
          submission: data,
        });
      })
      .catch((err) => {
        for (var file of req.files) {
          fs.unlinkSync(file.path);
        }
        res.json(err);
      });
  }
);

//FOR INSTRUCTOR
const route2 = express.Router();
route2.use(jwtCheck);

//FOR INSTRUCTOR VIEW OF SUBMISSIONS MADE FOR A TASK WITH INSTRUCTOR KEY AND TASKID
route2.get("/:KEY", (req, res) => {
  var subdata = {
    key: req.params.KEY,
  };
  Submission.get(subdata)
    .then((data) => {
      for (var sub of data) {
        var files = [];
        if (sub.submission_files != "") {
          for (var file of sub.submission_files.split(",")) {
            files.push("http://" + req.hostname + ":" + port + file);
          }
        }
        sub.submission_files = files;
      }
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

//FOR INSTRUCTOR VIEW OF SUBMISSIONS MADE FOR A TASK WITH INSTRUCTOR KEY AND TASKID
route2.get("/:KEY/:TASKID", (req, res) => {
  var subdata = {
    taskid: req.params.TASKID,
    key: req.params.KEY,
  };
  Submission.get(subdata)
    .then((data) => {
      for (var sub of data) {
        var files = [];
        if (sub.submission_files != "") {
          for (var file of sub.submission_files.split(",")) {
            files.push("http://" + req.hostname + ":" + port + file);
          }
        }
        sub.submission_files = files;
      }
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

//FOR INSTRUCTOR VIEW OF SUBMISSIONS MADE FOR A TASK WITH INSTRUCTOR KEY, TASKID AND SUBID
route2.get("/:KEY/:TASKID/:SUBID", (req, res) => {
  var subdata = {
    id: req.params.SUBID,
    taskid: req.params.TASKID,
    key: req.params.KEY,
  };
  Submission.get(subdata)
    .then((data) => {
      for (var sub of data) {
        var files = [];
        if (sub.submission_files != "") {
          for (var file of sub.submission_files.split(",")) {
            files.push("http://" + req.hostname + ":" + port + file);
          }
        }
        sub.submission_files = files;
      }
      res.json(data);
    })
    .catch((err) => {
      res.json(err);
    });
});

route2.put("/:KEY/:TASKID/:SUBID", (req, res) => {
  var details = {
    key: req.params.KEY,
    taskid: req.params.TASKID,
    subid: req.params.SUBID,
    grades: req.body.grades,
  };
  if (checkInt(`${details.taskid}`) && checkInt(`${details.subid}`)) {
    Submission.grade(details)
      .then((response) => {
        res.json({
          statud: "Success",
          details: response,
        });
      })
      .catch((err) => {
        console.log(details);
        res.json(err);
      });
  } else {
    res.json({
      error: "Invalid taskid or subid",
    });
  }
});

export default {
  r1: route,
  r2: route2,
};
