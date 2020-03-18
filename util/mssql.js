// 配置文件
const {mssqlConf} = require('./database.config.js');
const mssql = require('mssql');

let db = {};


db.sql = function (sql, callback) {
    let connection = new mssql.ConnectionPool(mssqlConf, function (err) {
        if (err) {
            callback(err, null);
            // console.error(err);
            return;
        }
        let ps = new mssql.PreparedStatement(connection);
        ps.prepare(sql, function (err) {
            if (err) {
                callback(err, null);
                // console.error(err);
                return;
            }
            ps.execute('', function (err, result) {
                if (err) {
                    callback(err, null);
                    // console.error(err);
                    return;
                }
                ps.unprepare(function (err) {
                    if (err) {
                        // console.error(err);
                        callback(err, null);
                        return;
                    }
                    callback(err, result);
                });
            });
        });
    });
};

// db.sql('select * from v_bom',(err,data) => {
//     console.error(err)
//     console.error(data)
// })
module.exports = db;

