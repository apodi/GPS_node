/**
 * Created by adix12 on 2/8/2017.
 */
var dbConfig = require('../config/dbconfig');
var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : dbConfig.gps_mysql_db.host,
    user     : dbConfig.gps_mysql_db.user,
    password : dbConfig.gps_mysql_db.password,
    database : dbConfig.gps_mysql_db.database
});
module.exports.connection = connection;
