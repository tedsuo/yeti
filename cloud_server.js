//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var cloud = require('./cloud.js');

var MC_HOST = 'localhost';
var MC_PORT = 1338;
var MC_RECONNECT = 3000;

var yetis = {};
var yeti_cloud_remote_methods = cloud.create(yetis);
var mc_client = dnode(yeti_cloud_remote_methods);

console.log('Trying to connect to MC at '+MC_HOST+':'+MC_PORT);
mc_client.connect({
    host:MC_HOST,
    port: MC_PORT,
    reconnect: MC_RECONNECT
  },
  function(remote,conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;

    conn.on('drop', function(){
      console.log('Connection to MC dropped from '+MC_HOST+':'+MC_PORT);
    });
    conn.on('refused', function(){
      console.log('Connection to MC refused at'+MC_HOST+':'+MC_PORT);
    });
    conn.on('reconnect', function(){
      console.log('Trying to reconnect to MC at '+MC_HOST+':'+MC_PORT);
    });
    console.log('Connected to MC at '+MC_HOST+':'+MC_PORT);
});

var yeti_cloud_server_port = parseInt(process.env.YETI_CLOUD_SERVER_PORT) || 1339;
var yeti_cloud_server = dnode(function(client, conn){
  var yeti = {client: client, conn: conn};
  conn.on('ready', function(){
    client.getId(function(err,pid){
      yeti.id = cloud.yeti_lookup(pid);
      console.log('yeti '+yeti.id+' arrived');
      yetis[yeti.id] = yeti;
      yeti_cloud_remote_methods.emit('ready_'+yeti.id);
    });
  });

  conn.on('end', function(){
    console.log('yeti '+yeti.id+' left');
    delete yetis[yeti.id];
  });

  this.report = function(result){
    mc_client.remote.report(yeti.id, result);
  };  

  this.updateTestStatus = function(status){
    mc_client.remote.updateTestStatus(yeti.id, status);
  };
  
  this.finished = function(){
    mc_client.remote.finished(yeti.id);
  };

}).listen(yeti_cloud_server_port, '0.0.0.0');
console.log('Created cloud dnode server for yetis on port '+yeti_cloud_server_port);
