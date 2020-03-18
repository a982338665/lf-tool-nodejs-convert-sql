
**1.安装mssql：**

    npm install mssql
    
**2.官网：**

    https://www.npmjs.com/package/mssql
    
**3.类型转换PROC：**

    1.位置：D:\git-20191029\ConvertSQL\proc
    2.执行：exec p_tb_mssqltomysql 'tbtest' -- tbtest为表名
   
**4.使用convert2.sql碰到的问题:**
    
    1.问题：第 2行id=7879295【v_Production_Line_Proc_Units  mysql表创建问题！ER_TOO_BIG_ROWSIZE: Row size too large. 
            The maximum row size for the used table type, not counting BLOBs, 
            is 65535. This includes storage overhead, check the manual. You have to change some columns to TEXT or BLOBs
      原因：MySQL对于每行存放数据的字节数总和是有限制的，最大字节数为65535，即64k。而这个限制条件，是不包含类型为text和blob的。
            如果存放的时utf数据，那么64k大概可以存放21845个 utf8字符。
            对于大文本字段或大字节字段建议使用text和blob，为了提高查询效率，大文本/大字节字段需要单独出一个子表存放
      解决：convert3.sql,将varchar>255的都换为text类型
