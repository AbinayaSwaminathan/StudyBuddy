var mysql = require('mysql2');
// var mysql = require('mysql2/promise');

var connectionpool = mysql.createPool({
    connectionLimit : 10,
    host: 'studymatedb.crj65ur06nyl.us-east-1.rds.amazonaws.com',
    port:'3306',
    user: 'admin',
    password: 'studymate2022#',
    database: 'studymate'
})
module.exports = connectionpool;