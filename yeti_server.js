//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var Yeti = require('./Yeti');

var yeti;

yeti = new Yeti();
    
var cloud_client = dnode({
  getId: function(callback){
    callback(null,process.pid);
  },
  set: function(settings, callback){
    yeti.set(settings, callback);
  },
  start: function(callback){
    yeti.start(callback);
  },
  stop: function(callback){
    yeti.stop();
    callback(null, yeti.status);
  },
  status: function(callback){
    yeti.getStatus(callback);
  }
});

if(process.env.NODE_ENV == 'production'){
  cloud_client.connect(1339, function(remote, conn){
    cloud_client.remote = remote;
    cloud_client.remote_conn = conn;
    yeti.remote = remote;
    yeti.status = 'awaiting commands';
    console.log('Connected to cloud on hailstorm.radicaldesigns.org:1337\n Awaiting Orders...');
  });
} else {
  console.log('Connecting to MC....');
  cloud_client.connect(1339, function(remote, conn){
    cloud_client.remote = remote;
    cloud_client.remote_conn = conn;
    yeti.remote = remote;
    yeti.status = 'awaiting commands';    
    console.log('Connected to cloud on localhost:1339\n Awaiting Orders...');
  });
}
