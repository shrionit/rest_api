import enigma from "../enigma.js";
import User from "./User.js";
import Task from "./Task.js";
import request from "request";
import Submission from "./Submission.js";

var options = {
  method: "POST",
  url: "https://dev-vlison11.eu.auth0.com/oauth/token",
  headers: { "content-type": "application/json" },
  body:
    '{"client_id":"t9F4e4x5ZKoB03ojVgI813UUP4MpWSXT","client_secret":"EBwhNdmis6Vbv0bWV4T_lQMDQMWOCxYQfmJwXve6uoT31VNee_xsJN2YIgCKgWVM","audience":"http://localhost:3000/","grant_type":"client_credentials"}',
};

function checkInt(n) {
  return n == parseInt(n, 10);
}

class Stat {
  static conn;
  constructor({
    connection = null,
    id = null,
    student_id = null,
    task_id = null,
    result = null,
    updated_on = null,
  } = {}) {
    if (connection) Submission.conn = connection;
    this.id = id;
    this.student_id = student_id;
    this.task_id = task_id;
    this.result = result;
    this.updated_on = updated_on;
  }

  static setConnection(connection) {
    Stat.conn = connection;
  }

  static checkBy({ id = null, tablename = null, sql = null } = {}) {
    var SQL = `SELECT * FROM ${tablename} WHERE id=${id}`;
    if (sql) {
      SQL = sql;
    }
    return new Promise((resolve, reject) => {
      Stat.conn.then((db) => {
        db.all(SQL, [], (err, rows) => {
          if (err) reject(false);
          if (rows && rows.length > 0) {
            resolve(true);
          } else {
            reject(false);
          }
        });
      });
    });
  }

  static getCount(tablename, sql = null) {
    var SQL = `SELECT count(id) as COUNT FROM ${tablename}`;
    if (sql) {
      SQL = sql;
    }
    return new Promise((resolve, reject) => {
      Stat.conn.then((db) => {
        db.get(SQL, [], (err, rows) => {
          if (err) reject(false);
          if (rows) {
            resolve(rows.COUNT || 0);
          } else {
            resolve(0);
          }
        });
      });
    });
  }

  static get(req) {
    console.log(req);
    return new Promise((resolve, reject) => {
      Stat.checkBy({
        sql: "SELECT * FROM students WHERE key='" + req.key + "'",
      })
        .then((exist) => {
          Stat.conn.then((db) => {
            var SQL =
              "SELECT * FROM stats WHERE student_id=(SELECT id FROM students WHERE key='" +
              req.key +
              "')";
            if (req.taskid) {
              if (checkInt(`${req.taskid}`)) {
                SQL += " and task_id=" + req.taskid;
              } else {
                reject({
                  error: "Invalid TASKID",
                });
              }
            }
            db.all(SQL, [], (err, rows) => {
              if (err) reject({ error: err.message });
              if (rows && rows.length > 0) {
                resolve(rows);
              } else {
                reject({ error: "No stats available." });
              }
            });
          });
        })
        .catch((err) => {
          reject({
            error: "Invalid key",
          });
        });
    });
  }
}

export default Stat;
