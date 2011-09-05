var spawn = require('child_process').spawn;

module.exports.create = function(){
  var yetis = [];
  return {
    create: function(callback){
      var yeti = spawn( process.argv[0],
        [__dirname+'/yeti_server.js'],{
        env: process.env
      });
      yeti.yeti_id = yeti.pid;
      yetis[yeti.yeti_id] = yeti;


      yeti.on('exit',function(){
        console.log('yeti '+yeti.yeti_id+' died');
        delete yetis[yeti.yeti_id];
      });

      yeti.stdout.on('data',function(msg){
        console.log('YETI '+yeti.yeti_id+': '+msg);
      });
      
      callback(null,yeti.pid);
      console.log('created yeti '+yeti.yeti_id);
    },
    
    destroy: function(yeti_id,callback){
      if(yetis[yeti_id]){
        yetis[yeti_id].kill();
        callback(null,'success');
      } else {
        callback(new Error('yeti '+yeti_id+' does not exit'));
      }
    }
  }
};
