
var sql = require('mssql');
//连接方式："mssql://用户名:密码@ip地址:1433(默认端口号)/数据库名称"
sql.connect("mssql://sa:123qwe!!@10.116.24.19:1433/SOADB_SC").then(function() {
    // Query
    new sql.Request().query('select * from v_BOM').then(function(recordset) {
        console.log(recordset);
    }).catch(function(err) {
        console.log(err);
    });
    // Stored Procedure
}).catch(function(err) {
    console.log(err);
})
