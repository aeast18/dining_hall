var https = require('https');

var config = require('./config');

module.exports = function sheets(){
  var MongoClient = require('mongodb').MongoClient;
  var url = 'mongodb://localhost:27017/db';

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.createCollection('menus', function(err, res) {
      if (err) throw err;
      db.createCollection('rating', function(err, res){
        if (err) throw err;

        var menus = db.collection('menus');
        var rating = db.collection('rating');

        rating.createIndex( { "name": 1 }, { unique: true }, function(err, res){

          sheets.importData = function(file){
            var content = file.buffer.toString();
            var newData = content.split(/(?:\r\n|\r|\n)/g).map( (element) => element.split('\t') ) ;
            newData.slice(1).forEach((element) => {
              sheets.addData(element);
            });
          }

          sheets.importOld = function(file){
            var content = JSON.parse(file.buffer.toString());
            content.slice(1).forEach((element) => {
              sheets.addData(element);
            });
          }

          sheets.addData = function(element){
            if(element&&element.length>1){
              menus.findOne({ value : element }, (err, result) => {
                if (err) throw err;
                if(!result){
                  var temp = element[1].split('-');
                  var itemDate = Date.UTC(parseInt(temp[0]),parseInt(temp[1])-1,parseInt(temp[2]));
                  menus.insertOne({
                    date: itemDate,
                    value: element,
                  });
                  tryAddMenu(element[8]);
                }
              });
            }
          }

          function tryAddMenu(keyname){
            rating.insertOne({
              name: keyname,
              rateCount: [0,0,0,0,0]
            }, function(err, res) {

            });
          }

          sheets.exportData = function(callback){
            menus.find({}).toArray( (err, result) => {
              if (err) throw err;
              callback(result);
            });
          }

          sheets.filterData = function(callback){
            var current = new Date();
            var msstart = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())-86400000;

            return menus.find({ date: { $gte: msstart, $lt : msstart+1000*60*60*24*7 } }).toArray( (err, result) => {
              if (err) throw err;
              callback(result);
            });
          }

          sheets.getRating = function(key, callback){
            return rating.findOne({ name: key }, (err, result) => {
              if (err) throw err;
              callback(result);
            });
          }

          sheets.addRating = function(key, value){
            sheets.getRating(key, (result) => {
              result.rateCount[value-1]++;
              rating.update({ name: key }, result);
            });
          }
        });
      });
    });
  });
}
