/**
 * Created by GGMs on 2/4/2017.
 */
var net = require("net");
var utils = require("./utils/utils.js")
var id;
var connectionArr = {};
var tcpServer = net.createServer(function (connection) {
    console.log("connection ESTAB");
    tcpServer.getConnections(function (error, count) {
        console.log("number of concurrent tcp connection " + count);
    });
    connection.on('end', function () {
        console.log("server disconnected....");
    });
    connection.on('close', function () {
        console.log("closed event fired");
        clearTimeout(id)
    });
    connection.on('data', function (data) {
        var init = data.slice(0, 2).toString('ascii');
        var cmd = data.slice(3, 4).toString('hex');
        console.log('Init :' + init);
        console.log('cmd : ' + cmd);
        if (init == "xx" && (cmd == "1" || cmd == "01" || cmd == 1)) {
            var abc = utils.parseLoginRequest(data);
            //console.log("Login Ack");
            //console.log(abc);
            var respBuff = new Buffer(10);
            respBuff[0] = 0x78;
            respBuff[1] = 0x78;
            respBuff[2] = 0x05;
            respBuff[3] = 0x01;
            respBuff[4] = 0x00;
            respBuff[5] = 0x01;
            respBuff[6] = 0xD9;
            respBuff[7] = 0xDC;
            respBuff[8] = 0x0D;
            respBuff[9] = 0x0A;
            connection.write(respBuff);
            connection.deviceId = parseInt(utils.getDeviceId(data).toString('hex'));
            console.log(connection.deviceId);
            if (connectionArr[connection.deviceId]) {
                connectionArr[connection.deviceId].push(connection);
            }
            else {
                connectionArr[connection.deviceId] = [];
                connectionArr[connection.deviceId].push(connection);
            }
            console.log('length=  ' + connectionArr[connection.deviceId].length);
            if (connectionArr[connection.deviceId].length > 1) {
                id = setTimeout(function () {
                    connectionArr[connection.deviceId][0].destroy();
                    connectionArr[connection.deviceId].splice(0, 1);
                }, 0);
            }
            //console.log(connectionArr);
        }
        else if (init == "xx" && (cmd == "16" || cmd == 16 || cmd == "10" || cmd == 10 )) {
            console.log('In else');
            console.log(data);
            var prtnumber = data.slice(3, 4).toString('hex');
            console.log('Protocol ----->' + prtnumber);
            if (prtnumber == "10" || prtnumber == 10 || prtnumber == "16" || prtnumber == 16) {
                console.log('This gps location data');
                var date = utils.getDeviceTime(data.slice(4, 10));
                console.log(date);
                var lat = data.slice(11, 15);
                var longitute = data.slice(15, 19);
                var direction = data.slice(20, 22);
                var speed = data.slice(19,20);
                speed = parseInt(speed.readUInt8(0));
                console.log("vechile speed is "+speed);
                var latDir = "S";
                var longDir = "E";
                var gpsPositioned = false;
                var gpsRealTime = true;
                if (direction) {
                    console.log(direction);
                    var byte1 = utils.dec2Completebin(direction.readUInt8(0));
                    var byte2 = utils.dec2Completebin(direction.readUInt8(1));
                    if (byte1.charAt(2) == 1) {
                        gpsRealTime = false;
                    }
                    if (byte1.charAt(3) == 1) {
                        gpsPositioned = true;
                    }
                    if (byte1.charAt(4) == 1) {
                        longDir = "W"
                    }
                    if (byte1.charAt(5) == 1) {
                        latDir = "N"
                    }
                }
                if (lat) {
                    lat = lat.readInt32BE(0);
                    var decimal = parseInt(lat) / 30000;
                    var seconds = decimal - Math.floor(decimal);
                    var minutes = decimal - seconds;
                    var degreeDecimal = parseInt(minutes) / 60;
                    minutes = degreeDecimal - Math.floor(degreeDecimal);
                    var degree = degreeDecimal - minutes;
                    console.log("lat:..degree=" + degree + "..minutes=" + minutes + "..seconds=" + seconds + "..dir: " + latDir);
                    var result = degree.toString() + parseInt(minutes * 60 + seconds).toFixed(4);
                    latitude = utils.degreeToDecimal(result, latDir);
                    console.log("latitude: " + latitude);
                }
                if (longitute) {
                    longi = longitute.readInt32BE(0);
                    var decimal = parseInt(longi) / 30000;
                    var seconds1 = decimal - Math.floor(decimal);
                    var minutes1 = decimal - seconds1;
                    var degreeDecimal = parseInt(minutes1) / 60;
                    minutes1 = degreeDecimal - Math.floor(degreeDecimal);
                    var degree1 = degreeDecimal - minutes1;
                    console.log("long:..degree=" + degree1 + "..minutes=" + minutes1 + "..seconds=" + seconds1 + "..dir: " + longDir);
                    var result = degree1.toString() + parseInt(minutes1 * 60 + seconds1).toFixed(4);
                    longitude = utils.degreeToDecimal(result, longDir);
                    console.log("longitude: " + longitude);
                }
                //insert lat long in sql db

                var obj = {};
                obj.imei = connection.deviceId;
                //latitude
                obj.latdeg = degree;
                obj.latmin = minutes;
                obj.latsec = seconds;
                obj.latdir = latDir;
                //longitude
                obj.longdeg = degree1;
                obj.longmin = minutes1;
                obj.longsec = seconds1;
                obj.longdir = longDir;
                //time
                obj.time = date ;
                //speed
                obj.speed = speed;
                utils.insertLocationData(obj);

                console.log('IMEI NUMBER :  ' + connection.deviceId);
                // console.log('Hex lat --->' + lat);
                // console.log('Hex longitute---->' + longitude);
            }
           // connection.destroy();
        }
        else if (init == "xx" && (cmd == "13" || cmd == 13)) {
            // console.log("This is not location data");
            // console.log("final called>>>")
            utils.authenticateHeartBeatRequest(data, connection);
        }

    });
    connection.on('error', function (error) {
        console.log('something wrong happened here');
        //connection.end('socket can send more data but it will be ended');
        connection.destroy();
    });

}).listen(1337);

process.on('uncaughtException', function (err) {
    var error = sanitize.sanitize(err);
    console.log('***Server Crashed with Uncaught Exception***', error);
    //errorHandler.logError(err);
    process.exit(1);
});