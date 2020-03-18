// 配置
// mssql://sa:123qwe!!@10.116.24.19:1433/SOADB_SC
let mssqlConf = {
    user: 'sa',
    password: '123qwe!!',  //刚刚改好的密码
    server: '10.116.24.19',
    port: 1433,
    database: 'SOADB_SC',
    pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 3000
    }
};


const mysqlConf = {
    pool: {
        host: 'localhost',
        user: 'root',
        password: 'qwe123',
        database: 'dbo',
        port: 3306
    },
};

module.exports.mssqlConf = mssqlConf;
module.exports.mysqlConf = mysqlConf;
