var zmq = require('..')
  , http = require('http')
  , should = require('should')
  , semver = require('semver');

describe('socket.stream', function(){

  //since its for libzmq4+, we target versions > 4.0.0
  var version = semver.lte(zmq.version, '4.0.0');

  it('should support a streaming socket', function (done){
    
    if (!version) {
      done();
      return console.warn('stream socket type in libzmq v4+');
    }

    var stream = zmq.socket('stream');
    stream.on('message', function (id,msg){
      
      msg.should.be.an.instanceof(Buffer);
      
      var raw_header = String(msg).split('\r\n');
      var method = raw_header[0].split(' ')[0];
      method.should.equal('GET');
      
      //due to HTTP GET method, prepare HTTP response for TCP socket
      var httpProtocolString = 'HTTP/1.0 200 OK\r\n' //status code
        + 'Content-Type: text/html\r\n' //headers
        + '\r\n'
        + '<!DOCTYPE html>' //response body
          + '<head>'        //make it xml, json, html or something else
            + '<meta charset="UTF-8">'
          + '</head>'
          + '<body>'
            +'<p>derpin over protocols</p>'
          + '</body>'
        +'</html>' 

      //zmq streaming prefixed by envelope's routing identifier
      stream.send([id,httpProtocolString]);
    });

    var addr = '127.0.0.1:47080';
    stream.bind('tcp://'+addr, function(){
      //send non-peer request to zmq, like an http GET method with URI path
      http.get('http://'+addr+'/aRandomRequestPath', function (httpMsg){
        
        //it's a readable stream as the good lord intended
        httpMsg.socket._readableState.reading.should.be.true
        
        //conventional node streams emit data events to process zmq stream response
        httpMsg.on('data',function (msg){
          msg.should.be.an.instanceof(Buffer);
          String(msg).should.equal('<!DOCTYPE html><head><meta charset="UTF-8"></head>'
            +'<body>'
              +'<p>derpin over protocols</p>'
            +'</body>'
          +'</html>');
          done();
        });
      });
    });
  });
});