

-- 解决属性名为关键字报错的问题

USE SOADB_SC
GO


CREATE  PROC [dbo].[p_tb_mssqltomysql]
@tbsql varchar(1000)
AS
SET NOCOUNT ON ;

--处理tablename的字符串，把tablename字符串分割成每一行存储进入表变量中
DECLARE @tab_tablename table(tbname varchar(100))
DECLARE @tbname varchar(100)
INSERT INTO @tab_tablename(tbname)
SELECT

      SUBSTRING(@tbsql,NUMBER,CHARINDEX(',',@tbsql+',',NUMBER)-number)
FROM master.dbo.spt_values
WHERE TYPE='P'  AND number>0 AND SUBSTRING(','+@tbsql,number,1)=','

--把mysql跟mssql的数据类型对应起来存储
--空间数据类型不处理
--money类型处理为float
--timestamp处理为 timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
DECLARE @tbtype table(mssql varchar(20),mysql varchar(20))
INSERT INTO @tbtype(mssql,mysql) values( 'bigint','bigint'),('binary','binary'),('binary','binary'),('bit','tinyint'),('char','char'),('date','date'),('datetime','datetime'),('datetime2','datetime'),('datetimeoffset','datetime'),('decimal','decimal'),('float','float'),('int','int'),('money','decimal'),('nchar','char'),('ntext','text'),('numeric','decimal'),('nvarchar','varchar'),('real','float'),('smalldatetime','datetime'),('smallint','smallint'),('smallmoney','decimal'),('text','text'),('time','time'),('timestamp','timestamp'),('tinyint','tinyint'),('uniqueidentifier','varchar(40)'),('varbinary','varbinary'),('varchar','varchar'),('xml','text')

DECLARE @tb_exec_sql table(tbname varchar(100),sql nvarchar(max),indexs nvarchar(max))
DECLARE @indexs_sql nvarchar(max)

--转化表格SQL
DECLARE NAME CURSOR FOR

SELECT tbname FROM @tab_tablename
OPEN NAME
FETCH NEXT FROM name INTO @tbname
WHILE @@FETCH_STATUS =0
BEGIN
     ;WITH data AS (
     SELECT
           case when b.is_unique=1 then ' UNIQUE ' else ' ' end is_unique,
           OBJECT_NAME(A.OBJECT_ID) obj_name,
           COL_NAME(A.object_id,A.column_id) colname,
           SUBSTRING(COL_NAME(A.object_id,A.column_id),1,3) col_short,
           is_included_column,
           index_column_id,
           a.index_id,
           A.OBJECT_ID
     FROM SYS.index_columns A INNER JOIN SYS.INDEXES B ON A.OBJECT_ID=B.OBJECT_ID AND A.index_id=B.index_id
     WHERE b.type!=1 and OBJECT_NAME(A.OBJECT_ID)=@tbname
     )
     SELECT
           @indexs_sql=
           REPLACE(
                      (STUFF(
                              (
                               SELECT
                                      ' CREATE '
                                         + a.is_unique
                                         +' INDEX '
                                         + CASE WHEN COUNT(*) >=3 THEN SUBSTRING(('IX_'+stuff((SELECT '_'+col_short FROM data b where a.object_id=b.object_id and a.index_id=b.index_id FOR XML PATH('')),1,1,'')),1,64)
                                              ELSE 'IX_'+stuff((SELECT '_'+colname FROM data b where a.object_id=b.object_id and a.index_id=b.index_id FOR XML PATH('')),1,1,'')
                                           END
                                         +' ON '
                                         + a.obj_name
                                         +'( '
                                         + stuff((SELECT ','+colname FROM data b where a.object_id=b.object_id and a.index_id=b.index_id FOR XML PATH('')),1,1,'')
                                         +' );
                                         '
                                FROM data a
                                GROUP BY a.is_unique,a.obj_name,a.object_id,a.index_id
                                ORDER BY a.object_id,a.index_id
                                FOR XML PATH('')

                               ),1,1,'')
                      ),'&#x0D;','')


      INSERT INTO @tb_exec_sql(tbname,indexs,sql)
      SELECT
            @tbname,@indexs_sql,
            'CREATE TABLE '+@tbname+'('+
             REPLACE(
                   STUFF( (
                               SELECT
                                     ','+
                                     '`'+
                                     a.name+
                                     '`'
                                    +
                                    case when b.name = 'timestamp' then ' timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP '
                                         when b.name = 'uniqueidentifier' then ' varchar(40) '
                                         when b.name in ('char','nchar','nvarchar','varbinary','varchar') then ( case when a.length<0 or a.length>255 then ' text ' else ' '+c.mysql+'('+ (case when b.name like 'n%' then cast(a.length/2 as varchar(10)) else cast(a.length as varchar(10)) end )+')'  end )
                                         when b.name in ('decimal','money','numeric','smallmoney') then ' '+c.mysql+'('+ cast(a.prec as varchar(10)) +','+ cast(a.scale as varchar(10)) +') '
                                         else ' '+c.mysql+' ' end
                                    +
                                    case when a.isnullable=0 then ' not null ' else ' null ' end
                                    +
                                    case when COLUMNPROPERTY( A.ID,A.NAME,'ISIDENTITY')=1 then ' PRIMARY key AUTO_INCREMENT ' else '' end
                                    +
                                    case when a.length<0 or b.name in ('text') then ' '
                                         when e.text like ' ((%' then ' default '+substring(e.text,3,len(e.text)-4)
                                         when e.text like ' (''%' then ' default '+substring(e.text,2,len(e.text)-2)
                                         else ' '
                                    end
                                    +
                                    ISNULL(' comment "'+cast(g.value as varchar(1000))+'"
                                                     ','
                                                     ')

                               FROM sys.syscolumns A
                               LEFT JOIN sys.systypes B ON A.XUSERTYPE=B.XUSERTYPE
                               LEFT JOIN @tbtype C ON b.name collate Chinese_PRC_CI_AS  = c.mssql
                               LEFT JOIN sys.sysobjects D ON A.ID=D.ID AND D.XTYPE='U' AND D.NAME<>'DTPROPERTIES'
                               LEFT JOIN sys.syscomments E ON A.CDEFAULT=E.ID
                               LEFT JOIN sys.extended_properties G ON A.ID=G.major_id AND A.COLID=G.minor_id
                               WHERE D.NAME =@tbname
                               order by a.colid
                               FOR XML PATH('')
                              ),1,1,'')
                        ,'&#x0D;','')
             +
             ISNULL(

                 ( SELECT

                                ', primary key ('+STUFF(
                                                              (
                                                                                     SELECT

                                                                ','+col_name(i.object_id,ik.column_id)
                                                         FROM sys.indexes i
                                                         JOIN sys.index_columns ik ON i.index_id=ik.index_id and i.object_id=ik.object_id
                                                         WHERE i.type=1 and i.object_id=object_id(@tbname)
                                                         ORDER BY key_ordinal
                                                         FOR XML PATH('')
                                                       ),1,1,'')

                                                                +') '
                     )
                       ,'')
             +
          ')'
          +
          ISNULL( (
                   SELECT
                                  ' COMMENT "'+CAST(value AS VARCHAR(1000))+'";
                             '

                         FROM sys.extended_properties

                           where major_id=object_id(@tbname) and minor_id=0
                         ),';')

          FETCH NEXT FROM NAME INTO @tbname
END
CLOSE NAME
DEALLOCATE NAME


SELECT * FROM @tb_exec_sql
