/**
 * Created by adix12 on 2/22/2017.
 */

var crc = require("crc-itu");
var datetime = require('date-and-time');
var dbConnector = require('../db/connection.js');

var insertLocationData = function (obj) {
    //dbConnector.connection.connect();
    var query = "INSERT INTO `tbl_gps_location` (`device_imei`, `time`, `latitute_deg`, `latitute_min`, `latitute_sec`, `latitute_dir`, `longitute_deg`, `longitute_min`, `longitute_sec`, `longitute_dir`,`speed`) VALUES (" + obj.imei + ",'" + obj.time + "'," + obj.latdeg + "," + obj.latmin + "," + obj.latsec + ",'" + obj.latdir + "'," + obj.longdeg + "," + obj.longmin + "," + obj.longsec + ",'" + obj.longdir + "'," + obj.speed + ")";
    // console.log(query);
    dbConnector.connection.query(query, function (error, results, fields) {
        if (error) throw error;
        // console.log('The solution is: ', results);
    });
    // dbConnector.connection.end();
}
var getDeviceTime = function (data) {
    var year = parseInt(data.readUInt8(0));
    var month = parseInt(data.readUInt8(1));
    var day = parseInt(data.readUInt8(2))
    var date = new Date(year + 2000, month - 1, day);
    date.setHours(parseInt(data.readUInt8(3)));
    date.setMinutes(parseInt(data.readUInt8(4)));
    date.setSeconds(parseInt(data.readUInt8(5)));
    date = datetime.format(date, 'YYYY-MM-DD HH:mm:ss');
    return date;
}
var getDeviceId = function (buffer) {
    const x = buffer.slice(4, 12);
    return x;
}
var parseLoginRequest = function (data) {
    var parsedDataObj = {};
    parsedDataObj.header = data.slice(0, 2);
    parsedDataObj.length = data.slice(2, 3);
    parsedDataObj.command = data.slice(3, 4);
    parsedDataObj.device_id = data.slice(4, 12);
    parsedDataObj.type_code = data.slice(12, 14);
    parsedDataObj.zone = data.slice(14, 16);
    parsedDataObj.info_serial_no = data.slice(data.length - 6, data.length - 4);
    parsedDataObj.checksum = data.slice(data.length - 4, data.length - 2);
    parsedDataObj.footer = data.slice(data.length - 2, data.length);
    return parsedDataObj;
}
var parseGpsInfo = function (data) {
    var parsedDataObj = {};
    parsedDataObj.date_time = data.slice(0, 6);
    parsedDataObj.satellites = data.slice(6, 7);
    parsedDataObj.latitude = data.slice(7, 11);
    parsedDataObj.longitude = data.slice(11, 15);
    parsedDataObj.speed = data.slice(15, 16);
    parsedDataObj.direction = data.slice(16, 18);
    return parsedDataObj;
}
var authenticateHeartBeatRequest = function (data, connection) {
    var parsedDataObj = parseHeartBeatStatusInfo(data);
    var checksum = parsedDataObj.checksum.toString('hex');
    var crcChecksum = crc.crc16(data.slice(2, 11), 'hex').toString(16);
    if ((crcChecksum == checksum || crcChecksum == parseInt(checksum))) {
        var serialNo = parsedDataObj.info_serial_no.toString('hex');
        var s1 = serialNo.substr(0, 2);
        var s2 = serialNo.substr(2, 2);
        var newChecksum = crc.crc16("0513" + s1 + s2, 'hex').toString(16);
        if (newChecksum.length == 3) {
            newChecksum = "0" + newChecksum;
        } else if (newChecksum.length == 2) {
            newChecksum = "00" + newChecksum;
        } else if (newChecksum.length == 1) {
            newChecksum = "000" + newChecksum;
        }
        else {
            console.log("insidddddddddddddddddddddddd status check");
        }

        var respBuff = new Buffer(10);
        respBuff[0] = 0x78;
        respBuff[1] = 0x78;
        respBuff[2] = 0x05;
        respBuff[3] = 0x13;
        respBuff[4] = '0x' + serialNo.substr(0, 2);
        respBuff[5] = '0x' + serialNo.substr(2, 2);
        respBuff[6] = '0x' + newChecksum.substr(0, 2);
        respBuff[7] = '0x' + newChecksum.substr(2, 2);
        respBuff[8] = 0x0D;
        respBuff[9] = 0x0A;
        console.log(respBuff.toString('hex'));
        connection.write(respBuff);
    }
}
var parsePositionRequest = function (data, vendor) {
    var parsedDataObj = {};
    parsedDataObj.header = data.slice(0, 2);
    parsedDataObj.length = data.slice(2, 3);
    parsedDataObj.command = data.slice(3, 4);
    parsedDataObj.gps_info = parseGpsInfo(data.slice(4, 22));
    if (vendor && vendor == "AXES") {
        parsedDataObj.upload_status = data.slice(data.length - 7, data.length - 6);
    }
    parsedDataObj.acc_status = data.slice(data.length - 9, data.length - 8);

    parsedDataObj.info_serial_no = data.slice(data.length - 6, data.length - 4);
    parsedDataObj.checksum = data.slice(data.length - 4, data.length - 2);
    parsedDataObj.footer = data.slice(data.length - 2, data.length);
    return parsedDataObj;
}
var parseHeartBeatStatusInfo = function (data) {
    var parsedDataObj = {};
    parsedDataObj.header = data.slice(0, 2);
    parsedDataObj.length = data.slice(2, 3);
    parsedDataObj.command = data.slice(3, 4);
    parsedDataObj.status_info = parseStatusInfo(data.slice(4, 9));
    parsedDataObj.info_serial_no = data.slice(9, 11);
    parsedDataObj.checksum = data.slice(data.length - 4, data.length - 2);
    parsedDataObj.footer = data.slice(data.length - 2, data.length);
    return parsedDataObj;
}
var parseStatusInfo = function (data) {
    var parsedDataObj = {};
    parsedDataObj.terminal_info = data.slice(0, 1);
    parsedDataObj.voltage = data.slice(1, 2);
    parsedDataObj.gsm_signal = data.slice(2, 3);
    parsedDataObj.alarm = data.slice(3, 5);
    return parsedDataObj;
}
var Hex2Bin = function (n) {
    if (!checkHex(n))
        return 0;
    return parseInt(n, 16).toString(2);
}
var dec2Completebin = function (dec) {
    var bin = (dec >>> 0).toString(2);
    var diff = 8 - bin.length;
    var result = "";
    for (var i = 0; i < diff; i++) {
        result += "0";
    }
    return result + bin;
}
var checkHex = function (n) {
    return /^[0-9A-Fa-f]{1,64}$/.test(n);
}
var degreeToDecimal = function (pos, pos_i) {
    if (typeof(pos_i) == "undefined")pos_i = "N";
    var data = pos.toString().split(".");
    var sec = data[1];
    var dg = data[0].substr(0, 2);
    var min = data[0].substr(2, 2);
    var res = (parseInt(dg) + (parseFloat(min + "." + sec) / 60)).toFixed(7);
    return (pos_i.toUpperCase() == "S" || pos_i.toUpperCase() == "W") ? res * -1 : res;
}

module.exports.insertLocationData = insertLocationData;
module.exports.getDeviceTime = getDeviceTime;
module.exports.getDeviceId = getDeviceId;
module.exports.parseLoginRequest = parseLoginRequest;
module.exports.parseGpsInfo = parseGpsInfo;
module.exports.authenticateHeartBeatRequest = authenticateHeartBeatRequest;
module.exports.parsePositionRequest = parsePositionRequest;
module.exports.parseHeartBeatStatusInfo = parseHeartBeatStatusInfo;
module.exports.parseStatusInfo = parseStatusInfo;
module.exports.Hex2Bin = Hex2Bin;
module.exports.dec2Completebin = dec2Completebin;
module.exports.checkHex = checkHex;
module.exports.degreeToDecimal = degreeToDecimal;