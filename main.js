const express = require('express')
    , http = require('http')
    , app = express()
    , config = require('config')
    , cron = require('node-cron');

global.sensor = {};
global.led_status = true;
global.request = "999999";

app.disable('x-powered-by');

//init
readSensor();


app.put('/led/*',(req, res) =>
{
    var cmd = req.url.split('/')[2];

    var d = {};
    d.result = "ok";
    d.cmd = cmd;

    switch (cmd)
    {
        case "on" :
            global.led_status = true;
            d.message = "led_status is on.";
            break;

        case "off" :
            global.led_status = false;
           d.message = "led_status is off.";
           break;
        default:
           d.result = "error";
           d.message = "invalid command: " + cmd;
           break;
    }

    setStatus();

    res.set('Content-Type', 'text/javascript; charset=utf-8');
    res.send(getStatus(d)); 
});

app.get('/status',(req, res)=>
{
    var d = {};
    d.result = "ok";

    res.set('Content-Type', 'text/javascript; charset=utf-8');
    res.send(getStatus(d)); 
});

http.createServer(app).listen(config.listen_port, function(){
  console.log('http server listening on port: ' + config.listen_port);
});


cron.schedule(config.cron_schedule, readSensor);


function setStatus()
{
    if (!global.led_status){
        global.request = "000999";
    } else
    {
        if (global.sensor.result == "ok"){
            global.request = "999999";

            if (global.sensor.humidity > 80) {
                //red
                global.request = "100999";
            } else if (global.sensor.humidity > 60) {
                //red blink
                global.request = "200999";
            } else if (global.sensor.humidity < 30) {
                //yellow blink
                global.request = "020999";
            } else if (global.sensor.humidity < 40) {
                //yellow
                global.request = "010999";
            } else if (global.sensor.humidity < 50) {
                //green blink
                global.request = "002999";
            } else {
                //green
                global.request = "001999";
            }
        }
    }
    http.get(config.url.patlite + global.request, function (res){});
}


function getStatus(p)
{
    var d = {};

    d.result = p.result;
    d.message = p.message;
    d.request = global.request;
    d.led_status = global.led_status;
    d.sensor = global.sensor;

    return JSON.stringify(d);
}

function readSensor()
{
    var _data = [];
    http.get(config.url.heater, function (res) 
    {
        res
        .on('data', function(chunk) {
            _data.push(chunk);

        })
        .on('end', function() {
            var events = Buffer.concat(_data);
            var data = JSON.parse(events);

            if (data.result == "ok"){
                global.sensor = data.sensor;

                setStatus();
            }
        });
    });
}
