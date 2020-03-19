const db = require('../util/mssql.js');
const db2 = require('../util/mysql.js');

function dealMsg(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, i, callback) {
    let sql = baseCreateSql + v.name + fromCreateSql + v.name + ";";
    let dropsql = basedropSql + v.name + suffixSql;
    //1.视图转换为表
    db.sql(sql, (err1, data1) => {
        //2.获取表结构并转换
        let execSql = exec + v.name + suffixSql;
        db.sql(execSql, (err2, data2) => {
            if (data2 && data2.recordset && data2.recordset.length > 0) {
                //3.取出转换好的mysql建表语句
                let mysqlSql = data2.recordset[0].sql;
                if (mysqlSql != null) {
                    //4.处理_0001
                    mysqlSql = mysqlSql.replace(/_0001/g, '')
                    //5.创建mysql数据表
                    db2.query(mysqlSql, [], (err3, data3) => {
                        if (!err3) {
                            console.error("第" + i + "个：：：" + v.name + "  done！")
                            callback(true, null)
                            //6.查询视图数据 - 失败暂时不记录
                            /*db.sql(selectSql + v.name + ";", (err4, data4) => {
                                if (data4 && data4.recordset && data4.recordset.length > 0) {
                                    //7.执行数据导入-单条导入，防止宕机
                                    data4.recordset.forEach((v1,i1) => {
                                        db2.query(insertSql+v.name+insertSqlSuffix,[v1],(err5,data5) => {
                                            // console.error(err5)
                                            // console.error(data5)
                                        })
                                    });
                                }
                            });*/
                        } else {
                            //已创建该表
                            if ("ER_TABLE_EXISTS_ERROR" == err3.code) {
                                console.error('第 ' + i + '行id=' + v.id + '【' + v.name + "  已创建")
                                callback(true, '第 ' + i + '行id=' + v.id + '【' + v.name + "|已创建|" + '】' + err3.message);
                            } else if ("ER_WRONG_AUTO_KEY" == err3.code) {
                                console.error('第 ' + i + '行id=' + v.id + '【' + v.name + "  暂不支持！")
                                callback(false, '第 ' + i + '行id=' + v.id + '【' + v.name + "|暂不支持|" + '】' + err3.message);
                            } else {
                                // console.error(err3.message+"|"+err3.code)
                                console.error('第 ' + i + '行id=' + v.id + '【' + v.name + "  mysql表创建问题！" + err3.message)
                                callback(false, '第 ' + i + '行id=' + v.id + '【' + v.name + "|mysql表创建问题|" + '】' + err3.message);
                            }
                        }
                    });
                } else {
                    console.error('第 ' + i + '行id=' + v.id + '【' + v.name + "  建表语句转换问题！")
                    callback(false, '第 ' + i + '行id=' + v.id + '【' + v.name + "|建表语句转换问题|" + '】' + mysqlSql);
                }
            } else {
                console.error('第 ' + i + '行id=' + v.id + '【' + v.name + " " + err2 == null ? 'NULL' : err2.message)
                callback(false, '第 ' + i + '行id=' + v.id + '【' + v.name + "||" + err2 == null ? 'NULL' : err2.message + '】');
            }
        })
    })
}

//获取所有视图的视图名称
const asyncAjax = function (baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, msg, i, recordset) {
    return new Promise(function (resolve, reject) {
        dealMsg(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, i, (err, data) => {
            if (!err) {
                msg.push(data + ' <br/>');
            }
            resolve(1);
            if (i === recordset.length - 1) {
                console.log(msg);
            }
        });
    });

}

//将视图转为表结构创建出来，不添加数据
const dealSync = async function (data) {
    let basedropSql = `drop table `
    let suffixSql = `_0001; `
    let baseCreateSql = `select top 500 * into `
    let fromCreateSql = `_0001 from `;//新建表名后缀添加0001
    let exec = "exec p_tb_mssqltomysql ";
    let selectSql = "select * from ";
    let insertSql = "insert into ";
    let insertSqlSuffix = " set ? ";
    let msg = [];
    for (let i = 0; i < data.recordset.length; i++) {
        let v = data.recordset[i];
        await asyncAjax(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, msg, i, data.recordset);
    }
}

// let sql = 'select TOP 0 * into v_BOM_01 from v_BOM;\n';
function convertSql(bool, viewName, callback) {
    //如果是true，获取所有视图转换
    let getView = "select id,name from sysobjects where xtype='V' ";
    if (!bool) {
        if (viewName) {
            getView = getView + " and name = '" + viewName + "'";
        } else {
            callback(0, '缺少视图名称！')
        }
    }
    // console.error(getView)
    //查询视图名称
    db.sql(getView, (err, data) => {
        if (data && data.recordset && data.recordset.length > 0) {
            dealSync(data);
        } else {
            callback(0, "暂无视图")
        }
    })


}

convertSql(true, null);
// convertSql(false, "v_BOM", (err, data) => {
// });
