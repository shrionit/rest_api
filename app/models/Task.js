import enigma from "../enigma.js";
import User from "./User.js";
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

class Task {
  static conn;
  constructor({
    connection = null,
    id = null,
    title = null,
    description = null,
    attachments = null,
    status = null,
    created_by = null,
    created_on = null,
  } = {}) {
    if (connection) Task.conn = connection;
    this.id = id;
    this.title = title;
    this.description = description;
    (this.attachments = attachments || []), (this.status = status);
    this.created_by = created_by;
    this.created_on = created_on;
  }

  static setConnection(connection) {
    Task.conn = connection;
  }

  static get(taskdata) {
    var SQL =
      "SELECT id, title, description, attachments, status, (SELECT name FROM teachers WHERE id=created_by) as instructor, created_on FROM tasks";
    if (taskdata.student) {
      if (checkInt(`${taskdata.id}`)) {
        SQL += " WHERE id=" + taskdata.id;
      }
      return new Promise((resolve, reject) => {
        Task.conn.then((db) => {
          db.get(
            "SELECT id, username FROM students WHERE key=?",
            [taskdata.key],
            (e, r) => {
              if (e) reject({ error: e.message });
              if (r) {
                db.all(SQL, [], (err, rows) => {
                  console.log(err, rows);
                  if (err) reject({ error: err.message });
                  if (rows && rows.length > 0) {
                    resolve(rows);
                  } else {
                    reject({
                      error: "Invalid TASKID",
                    });
                  }
                });
              } else {
                reject({
                  error: "Invalid key",
                  key: taskdata.key,
                });
              }
            }
          );
        });
      });
    } else {
      SQL = "SELECT * FROM tasks";
      var checks = [];
      if (Object.keys(taskdata).length > 0) {
        for (var key in taskdata) {
          if (taskdata[key] && taskdata[key] != "") {
            checks.push(`${key}=?`);
          }
        }
      }
      if (checks.length > 0) {
        SQL += " WHERE ";
        SQL += checks.join(" and ");
      }
      return new Promise((resolve, reject) => {
        Task.conn.then((db) => {
          db.get(
            "SELECT id, username FROM teachers WHERE key=?",
            [taskdata.created_by],
            (e, r) => {
              if (e) {
                reject({
                  error: "Invalid key",
                  key: taskdata.created_by,
                });
              }
              if (r) {
                taskdata.created_by = r.id;
                db.all(SQL, Object.values(taskdata), (err, rows) => {
                  if (err)
                    reject({
                      error: err.message,
                    });
                  else {
                    if (rows.length == 1) {
                      rows = rows[0];
                      rows.created_by = r.username;
                      resolve([rows]);
                    } else if (rows.length > 1) {
                      for (var rw of rows) {
                        rw.created_by = r.username;
                      }
                      resolve(rows);
                    } else {
                      reject({
                        error: "No data found",
                      });
                    }
                  }
                });
              } else {
                reject({
                  error: "Invalid key",
                  key: taskdata.created_by,
                });
              }
            }
          );
        });
      });
    }
  }

  static create(taskdata) {
    var SQL =
      "INSERT INTO tasks(id, title, description, attachments, status, created_by, created_on) VALUES(?, ?, ?, ?, ?, ?, ?)";
    var output = {};
    return new Promise((resolve, reject) => {
      Task.conn.then((db) => {
        db.get("SELECT count(id) as COUNT FROM tasks", [], (e, r) => {
          taskdata.id = r.COUNT + 1;
          db.get(
            "SELECT id FROM teachers WHERE key='" + taskdata.key + "'",
            [],
            (ee, rr) => {
              if (ee) {
                output.error = "Invalid Key";
                output.key = taskdata.key;
                reject(output);
              }
              if (rr) {
                taskdata.created_by = rr.id;
                taskdata.status = true;
                taskdata.created_on = new Date().toISOString();
                var params = [
                  taskdata.id,
                  taskdata.title,
                  taskdata.description,
                  taskdata.attachments,
                  taskdata.status,
                  taskdata.created_by,
                  taskdata.created_on,
                ];
                db.run(SQL, params, (err, row) => {
                  if (err) {
                    output.error = err.message;
                    reject(output);
                  } else {
                    resolve({
                      success: "Task Created",
                      task: taskdata,
                    });
                  }
                });
              } else {
                output.error = "Invalid Key";
                output.key = taskdata.key;
                reject(output);
              }
            }
          );
        });
      });
    });
  }

  static update(taskdata) {
    var updates = [],
      output = {};
    taskdata.status = true;
    taskdata.created_on = new Date().toISOString();
    for (var key in taskdata) {
      if (!["key", "id"].includes(key)) {
        updates.push(`${key}='${taskdata[key]}'`);
      }
    }
    var SQL =
      "UPDATE tasks SET " + updates.join(", ") + " WHERE id=" + taskdata.id;
    return new Promise((resolve, reject) => {
      Task.conn.then((db) => {
        db.get(
          "SELECT id FROM teachers WHERE key='" + taskdata.key + "'",
          [],
          (ee, rr) => {
            if (ee) {
              output.error = "Invalid Key";
              output.key = taskdata.key;
              reject(output);
            }
            if (rr) {
              taskdata.created_by = rr.id;
              db.get(
                "SELECT count(id) as COUNT, attachments FROM tasks WHERE id=? and created_by=?",
                [taskdata.id, rr.id],
                (e, r) => {
                  if (r.COUNT > 0) {
                    var prevAttachments = r.attachments.split(",");
                    db.run(SQL, (err, row) => {
                      if (err) {
                        output.error = err.message;
                        output.task = {
                          id: taskdata.id,
                          title: taskdata.title,
                        };
                        reject(output);
                      }
                      resolve({
                        success: "Task Updated",
                        task: taskdata,
                        tobedeleted: prevAttachments.filter(
                          (e) => !taskdata.attachments.includes(e)
                        ),
                      });
                    });
                  } else {
                    output.error = "Task not found";
                    output.task = {
                      id: taskdata.id,
                      title: taskdata.title,
                    };
                    reject(output);
                  }
                }
              );
            } else {
              output.error = "Invalid Key";
              output.key = taskdata.key;
              reject(output);
            }
          }
        );
      });
    });
  }

  static delete(taskdata) {
    var SQL = "DELETE FROM tasks WHERE id=? and created_by=?";
    var created_by = null;
    var output = {};
    return new Promise((resolve, reject) => {
      Task.conn.then((db) => {
        db.get(
          "SELECT id FROM teachers WHERE key=?",
          [taskdata.key],
          (e, r) => {
            if (e) {
              (output.error = "Invalid key"), reject(output);
            }
            if (r) {
              created_by = r.id;
              db.get(
                "SELECT attachments, title FROM tasks WHERE id=? and created_by=?",
                [taskdata.id, created_by],
                (err, row) => {
                  if (err) {
                    output.error = err.message;
                    reject(output);
                  }
                  if (row) {
                    output.tobedeleted = row.attachments.split(",");
                    db.run(SQL, [taskdata.id, created_by], (er, ro) => {
                      if (er) {
                        output.error = er.message;
                        reject(output);
                      }
                      output.success = "Task deleted";
                      output.deleted = {
                        id: taskdata.id,
                        title: row.title,
                      };
                      resolve(output);
                    });
                  } else {
                    (output.error = "Task not found."),
                      (output.task = taskdata),
                      reject(output);
                  }
                }
              );
            }
          }
        );
      });
    });
  }
}

export default Task;
