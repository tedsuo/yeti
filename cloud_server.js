//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var cloud = require('./cloud.js');

var MC_HOST = 'localhost';
var MC_PORT = 1338;
var MC_RECONNECT = 3000;

yeti_cloud = cloud.create();
var mc_client = dnode(yeti_cloud);

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

