const request = require('request');
const express = require('express');
const app = express();

function env(environmentVar, defaultValue) {
    return process.env.hasOwnProperty(environmentVar)
        ? process.env[environmentVar]
        : defaultValue;
}

const config = {
    'bindAddr': env('TVH_BINDADDR', ''),
    'tvhURL': env('TVH_URL', 'http://test:test@localhost:9981'),
    'tvhProxyURL': env('TVH_PROXY_URL', 'http://localhost'),
    'tunerCount': env('TVH_TUNER_COUNT', 6), // number of tuners in tvh
    'tvhWeight': env('TVH_WEIGHT', 300),  // subscription priority
    'chunkSize': env('TVH_CHUNK_SIZE', 1024*1024),  // usually you don't need to edit this
    'streamProfile': env('TVH_PROFILE', 'pass')  // specifiy a stream profile that you want to use for adhoc transcoding in tvh, e.g. mp4
};

const device = {
    'FriendlyName': 'TVFrontend',
    'Manufacturer' : 'Silicondust',
    'ModelNumber': 'HDTC-2US',
    'FirmwareName': 'hdhomeruntc_atsc',
    'TunerCount': config['tunerCount'],
    'FirmwareVersion': '20180613',
    'DeviceID': '339192',
    'DeviceAuth': 'test1235',
    'BaseURL': config['tvhProxyURL'],
    'LineupURL': `${config['tvhProxyURL']}/lineup.json`
};

function deviceInfo(req, res) {
    res.header('Content-Type', 'application/xml');
    res.send(`
         <root xmlns="urn:schemas-upnp-org:device-1-0">
            <specVersion>
                <major>1</major>
                <minor>0</minor>
            </specVersion>
            <URLBase>${ device.BaseURL }}</URLBase>
            <device>
                <deviceType>urn:schemas-upnp-org:device:MediaServer:1</deviceType>
                <friendlyName>${ device.FriendlyName }}</friendlyName>
                <manufacturer>${ device.Manufacturer }}</manufacturer>
                <modelName>${ device.ModelNumber }}</modelName>
                <modelNumber>${ device.ModelNumber }}</modelNumber>
                <serialNumber></serialNumber>
                <UDN>uuid:${ device.DeviceID }}</UDN>
            </device>
        </root>   
    `);
}

function fetchChannels() {
    const url = `${config['tvhURL']}/api/channel/grid?start=0&limit=999999`;
    return new Promise(((resolve, reject) => {
        request.get(url, (error, response, body) => {
            if (error) reject(error);
            else resolve(JSON.parse(body)['entries']);
        });
    }));
}

app.use(function (req, res, next) {
    console.log(`[${req.method}]\t ${req.originalUrl}`);
    next()
});

app.get('/lineup.post', (req, res) => res.send(''));
app.post('/lineup.post', (req, res) => res.send(''));


app.get('/', deviceInfo);
app.get('/device.xml', deviceInfo);

app.get('/discover.json', (req, res) => res.send(JSON.stringify(device)));

app.get('/lineup_status.json', (req, res) => res.send(JSON.stringify({
    'ScanInProgress': 0,
    'ScanPossible': 1,
    'Source': "Cable",
    'SourceList': ['Cable']
})));

app.get('/lineup.json', (req, res) => {
    fetchChannels().then(channels => {
        let x = 0;
        const lineup = channels.reduce((lineup, channel) => {
            if (channel.enabled) {
                const url = `${config['tvhURL']}/stream/channel/${channel.uuid}?profile=${config['streamProfile']}&weight=${config['tvhWeight']}`;
                lineup.push({
                    'GuideNumber': (x++).toString(), //channel['number'],
                    'GuideName': channel['name'],
                    'URL': url
                });
            }

            return lineup;
        }, []);

        res.send(JSON.stringify(lineup));
    }).catch(error => {
        res.send(error);
    });
});

app.listen(5004, () => console.log('Listening on port 5004.'));