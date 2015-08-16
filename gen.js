function Runner(gen){
  var key_response = {};

  function yielded_action(yielded){
    if(Object.prototype.toString.call(yielded) === '[object Function]'){
      var context = {
        get_response_by_key: function(key, callback){
          if(key in key_response){
            var res = key_response[key];
            delete key_response[key];
            callback(res);
          } else {
            key_response[key] = callback;
          }
        }
      };
      yielded.call(context, callback);
      return;
    }

    if(Object.prototype.toString.call(yielded) === '[object Number]'){
      setTimeout(callback, yielded);
      return;
    }

    if(Object.prototype.toString.call(yielded) === '[object String]'){
      var yielded = gen.next(reg_callback(yielded)).value;
      if(yielded === undefined){return}
      yielded_action(yielded);
      return;
    }

    if(Object.prototype.toString.call(yielded) === '[object Array]'){
      var res = new Array(yielded.length);
      var count = 0;

      var cb = function(index){
        return function(response){
          res[index] = response;
          count++;
          if(count == yielded.length){
            callback(res);
          }
        }
      }

      for(var i = 0, l = yielded.length; i < l; i++){ yielded[i](cb(i)) }
      return;
    }
  }

  function reg_callback(key){
    return function(response){
      if(key in key_response){
        var cb = key_response[key];
        delete key_response[key];
        cb(response);
      } else {
        key_response[key] = response;
      }
    }
  }

  function callback(response){
    var yielded = gen.next(response).value;
    if(yielded === undefined){return}
    yielded_action(yielded);
  }

  function run(){
    var yielded = gen.next().value;
    yielded_action(yielded);
  }

  return { run: run }
}




function engine(func){
  var that = this;
  var wrapper = function(){
    gen = func.apply(that, arguments)
    if(gen){
      Runner(gen).run()
    }
  }

  return wrapper
}


function Wait(key){
  var that = this;
  return function(callback){
    this.get_response_by_key.call(that, key, callback);
  }
}


function Task(){
  var func = arguments[0];
  var arg = Array.prototype.slice.call(arguments, 1);
  var that = this;

  return function(callback){
    arg.push(callback)
    func.apply(that, arg);
  }
}










var http = require('http');

var fetch = function(url, callback){
  http.request({
    hostname: url,
    port: 80,
    path: '/',
    method: 'GET'
  }, function(res){
    res.setEncoding('utf8');
    res.on('data', function(chunk){
      callback(chunk);
    });
  }).end();
}


var timeout_fetch = function(url, sec, callback){
  setTimeout(function(){
    fetch(url, callback);
  }, sec * 1000);
}




engine(function*(){

  var res_a = yield Task(timeout_fetch, 's.zys.me', 1);
  console.log('A', res_a);

  timeout_fetch('s.zys.me', 1, yield 'x');
  yield 1000;
  console.log('...');
  var res_b = yield Task(timeout_fetch, 's.zys.me', 1);
  console.log('B', res_b);

  res = yield Wait('x');
  console.log('x');
  console.log(res);

  var r = yield [Task(timeout_fetch, 's.zys.me', 1),
                 Task(timeout_fetch, 's.zys.me', 2)];

  console.log(r);

})();


