import enigma from "../enigma.js";
import User from "./User.js";
import Task from "./Task.js";
import request from "request";

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

class Submission {
  static conn;
  constructor({
    connection = null,
    id = null,
    submission_by = null,
    submission_for = null,
    submission_approved = null,
    submission_date = null,
  } = {}) {
    if (connection) Submission.conn = connection;
    this.id = id;
    this.submission_by = submission_by;
    this.submission_for = submission_for;
    this.submission_approved = submission_approved;
    this.submission_date = submission_date;
  }

  static setConnection(connection) {
    Submission.conn = connection;
  }

  static checkBy({ id = null, tablename = null, sql = null } = {}) {
    var SQL = `SELECT * FROM ${tablename} WHERE id=${id}`;
    if (sql) {
      SQL = sql;
    }
    return new Promise((resolve, reject) => {
      Submission.conn.then((db) => {
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
      Submission.conn.then((db) => {
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

  static grade(details) {
    var taskid = details.taskid;
    var subid = details.subid;
    var key = details.key;
    return new Promise((resolve, reject) => {
      if (details.grades && details.grades > 0 && details.grades < 6) {
        Submission.conn.then((db) => {
          Submission.checkBy({
            sql: "SELECT id FROM teachers WHERE key='" + key + "'",
          })
            .then((exist) => {
              if (exist) {
                Submission.checkBy({ id: taskid, tablename: "tasks" })
                  .then((exist2) => {
                    if (exist2) {
                      Submission.checkBy({
                        id: subid,
                        tablename: "submissions",
                      })
                        .then((exist3) => {
                          Submission.checkBy({
                            sql:
                              "SELECT * FROM stats WHERE student_id=(SELECT submission_by FROM submissions WHERE id=" +
                              subid +
                              ") and task_id=" +
                              taskid,
                          })
                            .then((exist4) => {
                              reject({
                                error: "Already approved and graded",
                              });
                            })
                            .catch((err) => {
                              db.run(
                                "UPDATE submissions SET submission_approved=1 WHERE id=" +
                                  subid,
                                [],
                                (e, r) => {
                                  if (e) reject({ error: e.message });
                                  else {
                                    var params = [];
                                    Submission.getCount("stats").then(
                                      (count) => {
                                        params.push(count + 1);
                                        params.push(subid);
                                        params.push(taskid);
                                        params.push(details.grades);
                                        params.push(new Date().toISOString());
                                        db.run(
                                          "INSERT INTO stats(id, student_id, task_id, result, updated_on) VALUES(?, (SELECT submission_by FROM submissions WHERE id=?), ?, ?, ?)",
                                          params,
                                          (err, row) => {
                                            if (err)
                                              reject({ error: err.message });
                                            else {
                                              resolve({
                                                id: params[0],
                                                student_id: params[1],
                                                task_id: params[2],
                                                result: params[3],
                                                updated_on: params[4],
                                              });
                                            }
                                          }
                                        );
                                      }
                                    );
                                  }
                                }
                              );
                            });
                        })
                        .catch((err) => {
                          if (!err) {
                            reject({
                              error: "Invalid SUBID",
                            });
                          }
                        });
                    }
                  })
                  .catch((err) => {
                    if (!err) {
                      reject({
                        error: "Invalid TASKID",
                      });
                    }
                  });
              }
            })
            .catch((err) => {
              if (!err) {
                reject({
                  error: "Invalid key",
                });
              }
            });
        });
      } else {
        if (details.grades) {
          reject({
            error: "Grades Range: [1, 5]",
          });
        } else {
          reject({
            error: "Grade not provided",
          });
        }
      }
    });
  }

  static get(subdata) {
    if (subdata.student) {
      var SQL =
        "SELECT * FROM submissions WHERE submission_by=(SELECT id FROM students WHERE key='" +
        subdata.key +
        "')";
      if (checkInt(`${subdata.id}`)) {
        SQL += " and id=" + subdata.id;
      }
      return new Promise((resolve, reject) => {
        Submission.conn.then((db) => {
          db.all(SQL, [], (e, r) => {
            if (e) {
              reject({
                error: e.message,
              });
            }
            if (r && r.length > 0) {
              resolve(r);
            } else {
              reject({
                error: "No submissions found",
              });
            }
          });
        });
      });
    } else {
      var SQL = "SELECT * FROM submissions WHERE submission_for=",
        SUBSQL =
          "SELECT id FROM tasks WHERE created_by=(SELECT id FROM teachers WHERE key='" +
          subdata.key +
          "')";
      if (checkInt(`${subdata.taskid}`)) {
        SUBSQL += " and id=" + subdata.taskid;
        SQL += "(" + SUBSQL + ")";
      }
      if (checkInt(`${subdata.id}`)) {
        SQL += " and id=" + subdata.id;
      }
      return new Promise((resolve, reject) => {
        Submission.conn.then((db) => {
          db.all(SQL, [], (e, r) => {
            if (e) {
              reject({
                error: e.message,
              });
            }
            if (r && r.length > 0) {
              resolve(r);
            } else {
              reject({
                error: "No submissions found",
              });
            }
          });
        });
      });
    }
  }

  static create(subdata) {
    var SQL =
      "INSERT INTO submissions(id, submission_by, submission_for, submission_files, submission_approved, submission_date) VALUES(?, ?, ?, ?, ?, ?)";
    var output = {};
    return new Promise((resolve, reject) => {
      Submission.conn.then((db) => {
        db.get("SELECT count(id) as COUNT FROM submissions", [], (e, r) => {
          subdata.submission_for = parseInt(subdata.id);
          subdata.id = r.COUNT + 1;
          db.get(
            "SELECT id, submission_for as taskid FROM submissions WHERE submission_for=" +
              subdata.submission_for +
              " and submission_by=(SELECT id FROM students WHERE key='" +
              subdata.key +
              "')",
            [],
            (Err, Row) => {
              if (Err) reject(Err);
              if (Row) {
                reject({
                  error: "Already submitted for TASKID: " + Row.taskid,
                });
              } else {
                db.get(
                  "SELECT id FROM students WHERE key='" + subdata.key + "'",
                  [],
                  (ee, rr) => {
                    if (ee) {
                      output.error = "Invalid Key";
                      output.key = subdata.key;
                      reject(output);
                    }
                    if (rr) {
                      subdata.submission_by = rr.id;
                      subdata.submission_approved = false;
                      subdata.submission_date = new Date().toISOString();
                      var params = [
                        subdata.id,
                        subdata.submission_by,
                        subdata.submission_for,
                        subdata.submission_files,
                        subdata.submission_approved,
                        subdata.submission_date,
                      ];
                      Task.get({
                        id: subdata.submission_for,
                        key: subdata.key,
                        student: true,
                      })
                        .then((task) => {
                          db.run(SQL, params, (err, row) => {
                            if (err) {
                              output.error = err.message;
                              reject(output);
                            } else {
                              resolve(subdata);
                            }
                          });
                        })
                        .catch((err) => {
                          reject({
                            error: "Task not found",
                          });
                        });
                    } else {
                      output.error = "Invalid Key";
                      output.key = subdata.key;
                      reject(output);
                    }
                  }
                );
              }
            }
          );
        });
      });
    });
  }
}

export default Submission;
