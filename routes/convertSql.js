const db = require('../util/mssql.js');
const db2 = require('../util/mysql.js');

function dropTableMssql(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, i, callback) {
    //是视图的时候删除
    if (v.xtype.trim() == 'V' || v.xtype.trim() == 'v') {
        let dropsql = basedropSql + v.name + suffixSql;
        db.sql(dropsql, (err, data) => {
            if (err) {
                callback(false, v.name, '第 ' + i + '行id=' + v.id + ' | ' + v.name + "删除失败：【" + err.code + "|" + err.message + "】")
            } else {
                callback(true, null, null)
            }
        })
    } else {
        callback(true, null, null)
    }
}

function convertMysql(execSql, i, v, callback) {
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
}

function dealMsg(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, i, callback) {
    let sql = baseCreateSql + v.name + fromCreateSql + v.name + ";";
    if (v.xtype.trim() == "U" || v.xtype.trim() == "u") {
        //数据表直接转换
        let execSql = exec + v.name + ";";
        convertMysql(execSql, i, v, callback);
    } else if (v.xtype.trim() == "V" || v.xtype.trim() == "v") {
        //1.视图转换为表
        db.sql(sql, (err1, data1) => {
            //2.获取表结构并转换
            let execSql = exec + v.name + suffixSql;
            convertMysql(execSql, i, v, callback);
        })
    } else {
        callback(false, "type类型错误")
    }
}

//获取所有视图的视图名称
const asyncAjax = function (baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, msg, dropmsg, i, recordset) {
    return new Promise(function (resolve, reject) {
        dealMsg(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, i, (err, data) => {
            dropTableMssql(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, i, (isnot, names, msgs) => {
                if (!err) {
                    msg.push(data + ' \n<br/>');
                }
                if (!isnot) {
                    dropmsg.push(msgs + ' \n<br/>')
                }
                resolve(1);
                if (i === recordset.length - 1) {
                    console.log(msg);
                }
            });
        });
    });

}

//将视图转为表结构创建出来，不添加数据
const dealSync = async function (data, callback) {
    let basedropSql = `drop table `
    let suffixSql = `_0001; `
    let baseCreateSql = `select top 500 * into `
    let fromCreateSql = `_0001 from `;//新建表名后缀添加0001
    let exec = "exec p_tb_mssqltomysql ";
    let selectSql = "select * from ";
    let insertSql = "insert into ";
    let insertSqlSuffix = " set ? ";
    let msg = [];
    let dropmsg = [];
    for (let i = 0; i < data.recordset.length; i++) {
        let v = data.recordset[i];
        await asyncAjax(baseCreateSql, v, fromCreateSql, basedropSql, suffixSql, exec, selectSql, msg, dropmsg, i, data.recordset);
    }
    callback(true, data.recordset.length, msg, dropmsg)
}

// let sql = 'select TOP 0 * into v_BOM_01 from v_BOM;\n';
/**
 * sqlserver视图同步为mysql数据表
 * @param bool = true 代表所有
 * @param viewName bool=false时取出的名字
 * @param callback
 * @param type V-视图 U-表 P-存储过程 TR触发器
 * 仅支持视图和表同步
 */
function convertSql(bool, viewNames, type, callback) {
    //如果是true，获取所有视图转换
    let getView = "select id,name,xtype from sysobjects where 1=1  "
    if (type && (type == "U" || type == "V")) {
        getView = getView + " and xtype = " + "'" + type + "' ";
    }
    if (!bool) {
        if (viewNames && viewNames.length > 0) {
            getView = getView + " and name in (";
            viewNames.forEach((v, i) => {
                getView = getView + "'" + v + "',";
            })
            getView = (getView.substring(getView.length - 1) == ',') ? getView.substring(0, getView.length - 1) : getView;
            getView = getView + ")";
        } else {
            callback(false, '缺少视图名称！', null, null)
        }
    }
    console.error(getView)
    //查询视图名称
    db.sql(getView, (err, data) => {
        if (data && data.recordset && data.recordset.length > 0) {
            dealSync(data,  (err, data, msg, dropmsg) => {
                callback(err, data, msg, dropmsg)
            });
        } else {
            callback(false, "暂无视图", null, null)
        }
    })
}

// convertSql(true, null, "V", (isnot, data, msg, dropmsg) => {
//     if (isnot) {
//         console.error("总共数据：" + data)
//         console.error("创建成功：" + (data - msg.length))
//         console.error("创建失败：" + msg.length)
//         console.error("失败详情：" + msg)
//         console.error("删除失败：" + dropmsg.length)
//         console.error("删除失败详情：" + dropmsg)
//     } else {
//         console.error(data)
//     }
// });
convertSql(false, ["v_ABCType", "v_bom"], 'V', (err, data) => {
});


function insertSql(bool, names,) {

};
