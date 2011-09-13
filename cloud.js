var spawn = require('child_process').spawn;

var yetis = [];
function verify_exists(id, mc_callback, func_callback){
  if(yetis[id]){
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
  return {
    create: function(id, callback){
      var yeti = spawn( process.argv[0],
        [__dirname+'/yeti_server.js'],{
        env: process.env
      });
      yeti.yeti_id = id;
      yetis[id] = yeti;
      yeti_hash_table[yeti.pid] = id;


      yeti.on('exit',function(){
        console.log('yeti '+yeti.yeti_id+' died');
        delete yetis[yeti.yeti_id];
      });

      yeti.stdout.on('data',function(msg){
        console.log('YETI '+yeti.yeti_id+': '+msg);
      });

      yeti.stderr.on('data',function(msg){
        console.log('YETI '+yeti.yeti_id+': '+msg);
      });

      
      callback(null);
      console.log('created yeti '+yeti.yeti_id);
    },
    
    destroy: function(id,callback){
      if(yetis[id]){
        yetis[id].kill();
        callback();
      } else {
        callback(new Error('yeti with test id '+id+' does not exit'));
      }
    },

    set: function(id, settings, callback){
      verify_exists(id, callback, function(){
        connected_yetis[id].client.set(settings, callback);
      });
    },

    start: function(id, callback){
      verify_exists(id, callback, function(){
        connected_yetis[id].client.start(callback);
      });
    },

    stop: function(id, callback){
      verify_exists(id, callback, function(){
        connected_yetis[id].client.stop(callback);
      });
    },

    status: function(id, callback){
      verify_exists(id, callback, function(){
        connected_yetis[id].client.status(callback);
      });
    }
  }
};
