var http = require('http');
var https = require('https');
var dns = require('dns');

var requests_buffer = parseInt(process.env.YETI_REQUESTS_BUFFER) || 10;

var Yeti = function(){
  this.settings = {};
  this.requests_sent = 0;
  this.request_log = {};
  this.status = 'waking up';
  this.report = {};
};

Yeti.prototype.send_report_flush = function(){
  this.remote.report(this.report);
  this.report = {};
};

Yeti.prototype.set = function(settings, callback){
  var yeti = this;
  // expects post body to be a json object with: protocol (http or https), port, host, requests, max_requests, concurrency
  this.clear_queue();
  // TODO: needs error checking on settings 
  this.settings = settings;
  var ipaddr_regex = new RegExp("^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$");
  if(!this.settings.host.match(ipaddr_regex)){
    dns.lookup(this.settings.host, function(err, addr){
      yeti.settings.ipaddr = addr;
      yeti.after_set(callback);
    });
  } else {
    this.settings.ipaddr = this.settings.host;
    this.after_set(callback);
  }
};

Yeti.prototype.after_set = function(callback){
  this.status = 'ready';
  this.settings.current_request_id = 0;
  this.agent = new http.Agent();
  this.agent.maxSockets = this.settings.concurrency;

  console.log(this.settings);
  callback(null, this.status);
}

// returns http or https
Yeti.prototype.get_protocol = function() {
  if(this.settings && this.settings.protocol == 'https')
    return https;
  else
    return http;
};

Yeti.prototype.start = function(callback){
  this.status = 'attacking';
  console.log(this.status);
  callback(null, this.status);
  this.num_requests = 0;
  this.request_log = [];
  this.requests_sent = 0;
  var initial_queue_size = this.settings.concurrency * 2;
  for( var i=0; i < initial_queue_size; i++) {
    this.attack();
  }
  this.initial_start_time = new Date().getTime();
  this.remote.updateTestStatus(this.status);
};

Yeti.prototype.queue_attack = function(){
  this.attack(this.num_requests);
};

Yeti.prototype.clear_queue = function() {
  this.status = 'hibernating';
  if(this.agent) this.agent.requests = {};
};

Yeti.prototype.stop = function() {
  this.clear_queue();
  this.send_report_flush();
  this.remote.finished();
};

Yeti.prototype.getStatus = function(callback) {
  callback(null,{
    status: this.status,
    requests_sent: this.requests_sent
  });
};

Yeti.prototype.attack = function(){
  if(this.num_requests >= this.settings.max_requests || this.status != "attacking") return;

  var yeti = this;
  var req_data = this.settings.requests[this.settings.current_request_id]
  var request_id = this.num_requests;
  this.request_log[request_id] = {};
  
  console.log('sending request '+this.num_requests+': '+JSON.stringify(req_data));
  
  // start a log for yeti request
  this.request_log[request_id] = {
    method: req_data.method,
    path: req_data.path
  };

  // make the request
  var options = {
    host: this.settings.ipaddr,
    port: this.settings.port,
    method: req_data.method,
    path: req_data.path,
    agent: this.agent,
    headers: {
        //'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0) Gecko/20100101 Firefox/6.0',
        'User-Agent': 'I AM YETI AND YOU ARE STUCK IN A HAILSTORM',
        'Connection': 'keep-alive',
        'Host': this.settings.host
    }
  }
  
  var req = this.get_protocol().request(options, function(res){
    res.on('end', function(){
      yeti.on_request_end(request_id,res);
    });
  });

  req.on('error', function(e){
    console.log('request '+request_id+' error: '+e.message);
  });
  
  req.on('socket', function(){
    yeti.on_request_start(request_id);
  });
  
  if(req_data.body) req.write(req_data.body);
  
  req.end();

  this.num_requests++;
  if(this.settings.current_request_id < this.settings.requests.length - 1){
    this.settings.current_request_id++;
  } else {
    this.settings.current_request_id = 0;
  }
};

Yeti.prototype.on_request_start = function(request_id){
  this.request_log[request_id].start_time = new Date().getTime() - this.initial_start_time;
};

Yeti.prototype.on_request_end = function(request_id,res){
  // queue up another request
  this.attack();
  
  this.requests_sent++;  
  if(this.settings.max_requests == this.requests_sent) {
    this.stop();
  }
    
  // log result
  this.request_log[request_id].end_time = new Date().getTime() - this.initial_start_time;
  this.request_log[request_id].response_time = this.request_log[request_id].end_time - this.request_log[request_id].start_time;
  this.request_log[request_id].status_code = res.statusCode;
  var yeti = this;
  console.log('request '+request_id+' '+this.request_log[request_id].method+' '+this.request_log[request_id].path+' finished with code '+this.request_log[request_id].status_code+' in '+this.request_log[request_id].response_time+' ms');
  this.log_to_report(request_id, function(){
    delete yeti.request_log[request_id];
    if(request_id % requests_buffer == 0){
      yeti.send_report_flush();
    }
  });
};

// gather the response, and put it into a reduced response object
Yeti.prototype.log_to_report = function(request_id, callback){
  var rounded_start_time = Math.ceil(this.request_log[request_id].start_time / 5000);
  var rounded_response = Math.round(this.request_log[request_id].response_time / 100);
  var rounded_end_time = rounded_start_time + rounded_response;
  var status_code = this.request_log[request_id].status_code;
  var method = this.request_log[request_id].method;
  var path = this.request_log[request_id].path;
  if(this.report[status_code] == undefined){
    this.report[status_code] = {};
  }
  if(this.report[status_code][method] == undefined){
    this.report[status_code][method] = {};
  }
  if(this.report[status_code][method][path] == undefined){
    this.report[status_code][method][path] = {};
  }
  if(this.report[status_code][method][path][rounded_end_time] == undefined){
    this.report[status_code][method][path][rounded_end_time] = {};
  }
  if(this.report[status_code][method][path][rounded_end_time][rounded_start_time] == undefined){
    this.report[status_code][method][path][rounded_end_time][rounded_start_time] = {};
  }
  if(this.report[status_code][method][path][rounded_end_time][rounded_start_time].count == undefined){
    this.report[status_code][method][path][rounded_end_time][rounded_start_time].count = 0;
  }
  this.report[status_code][method][path][rounded_end_time][rounded_start_time].count++;
  callback();
}

module.exports = Yeti;
