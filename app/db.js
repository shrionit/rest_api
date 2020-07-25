import sqlite3 from "sqlite3";
const sqlite = sqlite3.verbose();
class DB{
    #username;
    #password;
    static file = '';
    static db = '';
    constructor(dbfilesource='', dbname='', dbuname='', dbupass=''){
        DB.file = dbfilesource;
        this.name = dbname;
        this.#username = dbuname;
        this.#password = dbupass;
    }

    static connect(){
        return new Promise((resolve, reject)=>{
            let conn = new sqlite.Database(DB.file, (err)=>{
                if(err){
                    reject(err);
                }
            });
            DB.db = conn;
            resolve(conn);
        });
    }
    
}

export default DB;