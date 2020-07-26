import enigma from "../enigma.js";
import request from "request";

var options = {
  method: "POST",
  url: "https://dev-vlison11.eu.auth0.com/oauth/token",
  headers: { "content-type": "application/json" },
  body:
    '{"client_id":"t9F4e4x5ZKoB03ojVgI813UUP4MpWSXT","client_secret":"EBwhNdmis6Vbv0bWV4T_lQMDQMWOCxYQfmJwXve6uoT31VNee_xsJN2YIgCKgWVM","audience":"http://localhost:3000/","grant_type":"client_credentials"}',
};
class User {
  static conn;
  static count = 0;
  #key;
  #password;
  constructor({
    connection = null,
    id = null,
    key = null,
    name = null,
    username = null,
    password = null,
    email = null,
    created_on = null,
    submissions = null,
    stats = null,
    istutor = false,
  } = {}) {
    if (connection) User.conn = connection;
    this.id = id;
    this.#key = key || null;
    this.name = name;
    this.username = username;
    this.#password = password;
    this.email = email;
    this.date = created_on;
    this.submissions = submissions;
    if (istutor) {
      this.tasks = tasks;
    } else {
      this.stats = stats;
    }
    this._getCount();
  }

  static setConnection(connection) {
    User.conn = connection;
  }

  _getCount() {
    let sql = "SELECT * FROM students";
    User.conn.then((db) => {
      db.all(sql, [], (err, rows) => {
        if (err) throw err;
        User.count = rows.length;
      });
    });
  }

  static get({ id = null, username = null, tutor = false }) {
    if (id || username) {
      var table = tutor ? "teachers" : "students";
      var SQL =
        "SELECT * FROM " +
        table +
        " WHERE " +
        (id ? `id=${id}` : username ? `username='${username}'` : `''=''`);
      return new Promise((resolve, reject) => {
        User.conn.then((db) => {
          db.get(SQL, [], (err, row) => {
            if (err) {
              reject({
                Status: "Failed",
                Error: err.message,
              });
            }
            row.created_on = new Date(row.created_on).toISOString();
            if (tutor) {
              SQL =
                'SELECT * FROM VIEW_SUBMISSIONS WHERE FOR="' +
                row.username +
                '"';
            } else {
              SQL =
                'SELECT * FROM VIEW_SUBMISSIONS WHERE BY="' +
                row.username +
                '"';
            }
            db.all(SQL, [], (e, r) => {
              row.submissions = [] || r;
              row.stats = [];
              resolve({
                Status: "Success",
                User: new User(row),
              });
            });
          });
        });
      });
    }

    var SQL = "SELECT * FROM " + (tutor ? "VIEW_TUTORS" : "VIEW_STUDENT");
    return new Promise((resolve, reject) => {
      User.conn.then((db) => {
        db.all(SQL, [], (err, rows) => {
          if (err) {
            reject({
              Status: "Failed",
              Error: err.message,
            });
          }
          for (var row of rows) {
            row.JOINING_DATE = new Date(row.JOINING_DATE).toUTCString();
          }
          resolve({
            Status: "Success",
            Users: rows,
          });
        });
      });
    });
  }

  static create(userdata) {
    var SQL =
      "INSERT INTO students(id, key, name, username, email, password, created_on) VALUES(?, ?, ?, ?, ?, ?, ?)";
    if (userdata.tutor) {
      SQL =
        "INSERT INTO teachers(id, key, name, username, email, password, created_on) VALUES(?, ?, ?, ?, ?, ?, ?)";
    }
    var data = {
      name: userdata.name,
      username: userdata.username,
      email: userdata.email || "",
      password: userdata.password,
    };
    var date = new Date().toISOString();
    data.date = date;
    return new Promise((resolve, reject) => {
      enigma.genkey(data.email, Date.now().toString()).then((key) => {
        data.key = key;
        User.conn.then((db) => {
          db.all(
            "SELECT count(id) as COUNT FROM " +
              (userdata.tutor ? "teachers" : "students"),
            [],
            (e, r) => {
              User.count = r[0].COUNT;
              data.id = User.count + 1;
              db.run(
                SQL,
                [
                  data.id,
                  data.key,
                  data.name,
                  data.username,
                  data.email,
                  data.password,
                  data.date,
                ],
                (e, r) => {
                  if (e) {
                    reject({
                      Status: "Failed",
                      Error: e.message,
                    });
                  }
                  resolve({
                    Status: "Success",
                    Created: data,
                  });
                }
              );
            }
          );
        });
      });
    });
  }

  static login(userdata) {
    var SQL = `SELECT * FROM ${
      userdata.tutor ? "teachers" : "students"
    } WHERE username='${userdata.username}' and password='${
      userdata.password
    }'`;
    var data = {
      access: {},
      user: {},
    };
    return new Promise((resolve, reject) => {
      User.conn.then((db) => {
        db.get(SQL, [], (err, row) => {
          if (err) {
            data.user = err.message;
            reject(data);
          }
          if (row) {
            request(options, function (error, response, body) {
              if (error) {
                data.access = error;
              }
              data.access = JSON.parse(body);
              data.user = row;
              resolve(data);
            });
          } else {
            data.user = {
              Error: "Incorrect username or password.",
            };
            reject(data);
          }
        });
      });
    });
  }
}

export default User;
