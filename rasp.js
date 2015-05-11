var got = require('got-promise');
var sendData = require('./sendData');

var API_URL = 'https://api.rasp.yandex.net/v1.0/search/';
var API_KEY = process.env.API_KEY;

var CLOSEST = 2;

var STATION_CODES = {
    KAZAN: 's2000003',
    RAMEN: 's9601841',
    ELECTR: 's9601647'
};

var DIRECTIONS = [
    ['KAZAN', 'RAMEN'],
    ['RAMEN', 'KAZAN'],
    ['ELECTR', 'RAMEN'],
    ['RAMEN', 'ELECTR']
];

function getStationCode(stationName){
    return STATION_CODES[stationName];
}

function getDateString(date){
    return (
        date.getFullYear() +
        '-' +
        (date.getMonth() + 1) +
        '-' +
        date.getDate()
    );
}

function getRasp(fromID, toID){
    return got.post(API_URL, {
        query: {
            apikey: API_KEY,
            format: 'json',
            from: fromID,
            to: toID,
            lang: 'ru',
            transport_types: 'suburban',
            date: getDateString(new Date())
        },
        json: true
    });
}

function isFutureTrain(i){
    var currentDate = new Date();
    return (new Date(i.departure) > currentDate);
}

function dataItemProccesor(item){
    var currentDate = new Date();
    return {
        departure: item.departure,
        arrival: item.arrival,
        duration: item.duration,
        from: item.from.title,
        to: item.to.title,
        delta: ( (new Date(item.departure) - currentDate) / 1000 )
    };
}

function directionDataBlockProccesor(directionData){
    return (directionData.threads
        .filter(isFutureTrain)
        .slice(0, CLOSEST)
        .map(dataItemProccesor)
    );
}

function titleShortener(title){
    if (title === 'Москва (Казанский вокзал)'){
        return 'Казан. вокзал';
    }
    if (title === 'Электрозаводская'){
        return 'Электрозавод.';
    }
    return title;
}

function directionDataBlockPrinter(directionData){

    var fromName = titleShortener(directionData[0].from);
    var toName = titleShortener(directionData[0].to);

    var title = `${ fromName } - ${ toName }:\n `;

    var trains = directionData.reduce(function(str, item){

        var departureTime = (new Date(item.departure)).toTimeString().slice(0, 5);
        var deltaTime = Math.round(item.delta / 60);

        str += `${ departureTime } (Δ ${ deltaTime } мин)\n`;

        return str;

    }, '');

    return (
        title + trains
    );
}

function main(){

    var raspDataPromises = DIRECTIONS.map(function(directionItem){

        var stationCodeFrom = getStationCode(directionItem[0]);
        var stationCodeTo = getStationCode(directionItem[1]);

        return getRasp(stationCodeFrom, stationCodeTo);
    });

    return Promise.all(raspDataPromises)
        .then(function(data){
            return data
                // TODO: check API response format (JSON schema?)
                .map(directionDataBlockProccesor)
                .map(directionDataBlockPrinter)
                .join('');
        })
        .then(function(data){
            sendData(data);
        })

        .catch(function(err){
            console.log(err);
        });
}

module.exports = main;
