var spawn = require('child_process').spawn;
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var yeti_processes = {};
function verify_exists(id, mc_callback, func_callback){
  if(yeti_processes[id]){
    func_callback();
  } else {
    mc_callback('yeti with test id '+id+' does not exist');
  }
}

var yeti_hash_table = {};

module.exports.yeti_lookup = function(pid){
  return yeti_hash_table[pid];
};

module.exports.create = function(connected_yetis){
  var cloud = new Cloud(connected_yetis);
  var methods = {};
  var add_method = function(method_name){
    if(typeof(cloud[method_name])=='function'){
      methods[method_name] = function(){ 
        cloud[method_name].apply(cloud,arguments);
      };
    }
  };  
  for( method_name in cloud ){
    add_method(method_name);
  }
  return methods;
};


var Cloud = function(yetis){
  this.yetis = yetis;
};

util.inherits(Cloud,EventEmitter);

Cloud.prototype.create = function(id, callback){
  var yeti_process = spawn( process.argv[0],
    [__dirname+'/yeti_server.js'],{
    env: process.env
  });
  yeti_process.yeti_id = id;
  yeti_processes[id] = yeti_process;
  yeti_hash_table[yeti_process.pid] = id;


  yeti_process.on('exit',function(){
    console.log('yeti '+yeti.yeti_id+' died');
    delete yeti_processes[yeti.yeti_id];
  });

  yeti_process.stdout.on('data',function(msg){
    console.log('YETI '+yeti_process.yeti_id+': '+msg);
  });

  yeti_process.stderr.on('data',function(msg){
    console.log('YETI '+yeti_process.yeti_id+': '+msg);
  });

  var on_ready = function(){
    callback(null);
    this.removeListener('ready_'+id, on_ready);
  }
  on_ready.bind(this);
  
  this.on('ready_'+id, on_ready);
  
  console.log('created process for yeti '+yeti_process.yeti_id);
},

Cloud.prototype.destroy = function(id,callback){
  if(yeti_processes[id]){
    yeti_processes[id].kill();
    callback();
  } else {
    callback(new Error('yeti with test id '+id+' does not exit'));
  }
},

Cloud.prototype.set = function(id, settings, callback){
  var cloud = this;
  verify_exists(id, callback, function(){
    cloud.yetis[id].client.set(settings, callback);
  });
},

Cloud.prototype.start = function(id, callback){
  var cloud = this;
  verify_exists(id, callback, function(){
    cloud.yetis[id].client.start(callback);
  });
},

Cloud.prototype.stop = function(id, callback){
  var cloud = this;
  verify_exists(id, callback, function(){
    cloud.yetis[id].client.stop(callback);
  });
},

Cloud.prototype.status = function(id, callback){
  var cloud = this;
  verify_exists(id, callback, function(){
    cloud.yetis[id].client.status(callback);
  });
}