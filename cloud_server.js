//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var cloud = require('./cloud.js');


yeti_cloud = cloud.create();
var mc_client = dnode(yeti_cloud);


    });
    });
});

if(process.env.NODE_ENV == 'production'){
  console.log('Trying to connect to MC on hailstorm.radicaldesigns.org:1338');
  mc_client.connect(1338, function(remote, conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;
    console.log('Connected to MC on hailstorm.radicaldesigns.org:1338');
  });
} else {
  console.log('Trying to connect to MC on localhost:1338');
  mc_client.connect(1338, function(remote, conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;
    console.log('Connected to MC on localhost:1338');
  });
}
