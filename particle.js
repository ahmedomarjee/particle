;(function(){


/**
 * hasOwnProperty.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (has.call(require.modules, path)) return path;
  }

  if (has.call(require.aliases, index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!has.call(require.modules, from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return has.call(require.modules, localRequire.resolve(path));
  };

  return localRequire;
};
require.register("LearnBoost-engine.io-protocol/lib/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var keys = require('./keys');

/**
 * Current protocol version.
 */
exports.protocol = 2;

/**
 * Packet types.
 */

var packets = exports.packets = {
    open:     0    // non-ws
  , close:    1    // non-ws
  , ping:     2
  , pong:     3
  , message:  4
  , upgrade:  5
  , noop:     6
};

var packetslist = keys(packets);

/**
 * Premade error packet.
 */

var err = { type: 'error', data: 'parser error' };

/**
 * Encodes a packet.
 *
 *     <packet type id> [ `:` <data> ]
 *
 * Example:
 *
 *     5:hello world
 *     3
 *     4
 *
 * @api private
 */

exports.encodePacket = function (packet) {
  var encoded = packets[packet.type];

  // data fragment is optional
  if (undefined !== packet.data) {
    encoded += String(packet.data);
  }

  return '' + encoded;
};

/**
 * Decodes a packet.
 *
 * @return {Object} with `type` and `data` (if any)
 * @api private
 */

exports.decodePacket = function (data) {
  var type = data.charAt(0);

  if (Number(type) != type || !packetslist[type]) {
    return err;
  }

  if (data.length > 1) {
    return { type: packetslist[type], data: data.substring(1) };
  } else {
    return { type: packetslist[type] };
  }
};

/**
 * Encodes multiple messages (payload).
 *
 *     <length>:data
 *
 * Example:
 *
 *     11:hello world2:hi
 *
 * @param {Array} packets
 * @api private
 */

exports.encodePayload = function (packets) {
  if (!packets.length) {
    return '0:';
  }

  var encoded = '';
  var message;

  for (var i = 0, l = packets.length; i < l; i++) {
    message = exports.encodePacket(packets[i]);
    encoded += message.length + ':' + message;
  }

  return encoded;
};

/*
 * Decodes data when a payload is maybe expected.
 *
 * @param {String} data, callback method
 * @api public
 */

exports.decodePayload = function (data, callback) {
  var packet;
  if (data == '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

  var length = ''
    , n, msg;

  for (var i = 0, l = data.length; i < l; i++) {
    var chr = data.charAt(i);

    if (':' != chr) {
      length += chr;
    } else {
      if ('' == length || (length != (n = Number(length)))) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      msg = data.substr(i + 1, n);

      if (length != msg.length) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      if (msg.length) {
        packet = exports.decodePacket(msg);

        if (err.type == packet.type && err.data == packet.data) {
          // parser error in individual packet - ignoring payload
          return callback(err, 0, 1);
        }

        var ret = callback(packet, i + n, l);
        if (false === ret) return;
      }

      // advance cursor
      i += n;
      length = '';
    }
  }

  if (length != '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

};

});
require.register("LearnBoost-engine.io-protocol/lib/keys.js", function(exports, require, module){

/**
 * Gets the keys for an object.
 *
 * @return {Array} keys
 * @api private
 */

module.exports = Object.keys || function keys (obj){
  var arr = [];
  var has = Object.prototype.hasOwnProperty;

  for (var i in obj) {
    if (has.call(obj, i)) {
      arr.push(i);
    }
  }
  return arr;
};

});
require.register("visionmedia-debug/index.js", function(exports, require, module){
if ('undefined' == typeof window) {
  module.exports = require('./lib/debug');
} else {
  module.exports = require('./debug');
}

});
require.register("visionmedia-debug/debug.js", function(exports, require, module){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

// persist

if (window.localStorage) debug.enable(localStorage.debug);

});
require.register("LearnBoost-engine.io-client/lib/index.js", function(exports, require, module){

module.exports = require('./socket');

/**
 * Exports parser
 *
 * @api public
 *
 */
module.exports.parser = require('engine.io-parser');

});
require.register("LearnBoost-engine.io-client/lib/socket.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var util = require('./util')
  , transports = require('./transports')
  , Emitter = require('./emitter')
  , debug = require('debug')('engine-client:socket')
  , parser = require('engine.io-parser');

/**
 * Module exports.
 */

module.exports = Socket;

/**
 * Global reference.
 */

var global = util.global();

/**
 * Noop function.
 *
 * @api private
 */

function noop () {};

/**
 * Socket constructor.
 *
 * @param {String|Object} uri or options
 * @param {Object} options
 * @api public
 */

function Socket(uri, opts){
  if (!(this instanceof Socket)) return new Socket(uri, opts);

  opts = opts || {};

  if ('object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  if (uri) {
    uri = util.parseUri(uri);
    opts.host = uri.host;
    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
    opts.port = uri.port;
    if (uri.query) opts.query = uri.query;
  }

  this.secure = null != opts.secure ? opts.secure :
    (global.location && 'https:' == location.protocol);

  if (opts.host) {
    var pieces = opts.host.split(':');
    opts.hostname = pieces.shift();
    if (pieces.length) opts.port = pieces.pop();
  }

  this.hostname = opts.hostname ||
    (global.location ? location.hostname : 'localhost');
  this.port = opts.port || (global.location && location.port ?
       location.port :
       (this.secure ? 443 : 80));
  this.query = opts.query || {};
  if ('string' == typeof this.query) this.query = util.qsParse(this.query);
  this.upgrade = false !== opts.upgrade;
  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
  this.forceJSONP = !!opts.forceJSONP;
  this.timestampParam = opts.timestampParam || 't';
  this.timestampRequests = !!opts.timestampRequests;
  this.flashPath = opts.flashPath || '';
  this.transports = opts.transports || ['polling', 'websocket', 'flashsocket'];
  this.readyState = '';
  this.writeBuffer = [];
  this.callbackBuffer = [];
  this.policyPort = opts.policyPort || 843;
  this.open();

  Socket.sockets.push(this);
  Socket.sockets.evs.emit('add', this);
};

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Protocol version.
 *
 * @api public
 */

Socket.protocol = parser.protocol; // this is an int

/**
 * Static EventEmitter.
 */

Socket.sockets = [];
Socket.sockets.evs = new Emitter;

/**
 * Expose deps for legacy compatibility
 * and standalone browser access.
 */

Socket.Socket = Socket;
Socket.Transport = require('./transport');
Socket.Emitter = require('./emitter');
Socket.transports = require('./transports');
Socket.util = require('./util');
Socket.parser = require('engine.io-parser');

/**
 * Creates transport of the given type.
 *
 * @param {String} transport name
 * @return {Transport}
 * @api private
 */

Socket.prototype.createTransport = function (name) {
  debug('creating transport "%s"', name);
  var query = clone(this.query);

  // append engine.io protocol identifier
  query.EIO = parser.protocol;

  // transport name
  query.transport = name;

  // session id if we already have one
  if (this.id) query.sid = this.id;

  var transport = new transports[name]({
    hostname: this.hostname,
    port: this.port,
    secure: this.secure,
    path: this.path,
    query: query,
    forceJSONP: this.forceJSONP,
    timestampRequests: this.timestampRequests,
    timestampParam: this.timestampParam,
    flashPath: this.flashPath,
    policyPort: this.policyPort
  });

  return transport;
};

function clone (obj) {
  var o = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o;
}

/**
 * Initializes transport to use and starts probe.
 *
 * @api private
 */

Socket.prototype.open = function () {
  this.readyState = 'opening';
  var transport = this.createTransport(this.transports[0]);
  transport.open();
  this.setTransport(transport);
};

/**
 * Sets the current transport. Disables the existing one (if any).
 *
 * @api private
 */

Socket.prototype.setTransport = function (transport) {
  var self = this;

  if (this.transport) {
    debug('clearing existing transport');
    this.transport.removeAllListeners();
  }

  // set up transport
  this.transport = transport;

  // set up transport listeners
  transport
    .on('drain', function () {
      self.onDrain();
    })
    .on('packet', function (packet) {
      self.onPacket(packet);
    })
    .on('error', function (e) {
      self.onError(e);
    })
    .on('close', function () {
      self.onClose('transport close');
    });
};

/**
 * Probes a transport.
 *
 * @param {String} transport name
 * @api private
 */

Socket.prototype.probe = function (name) {
  debug('probing transport "%s"', name);
  var transport = this.createTransport(name, { probe: 1 })
    , failed = false
    , self = this;

  transport.once('open', function () {
    if (failed) return;

    debug('probe transport "%s" opened', name);
    transport.send([{ type: 'ping', data: 'probe' }]);
    transport.once('packet', function (msg) {
      if (failed) return;
      if ('pong' == msg.type && 'probe' == msg.data) {
        debug('probe transport "%s" pong', name);
        self.upgrading = true;
        self.emit('upgrading', transport);

        debug('pausing current transport "%s"', self.transport.name);
        self.transport.pause(function () {
          if (failed) return;
          if ('closed' == self.readyState || 'closing' == self.readyState) {
            return;
          }
          debug('changing transport and sending upgrade packet');
          transport.removeListener('error', onerror);
          self.emit('upgrade', transport);
          self.setTransport(transport);
          transport.send([{ type: 'upgrade' }]);
          transport = null;
          self.upgrading = false;
          self.flush();
        });
      } else {
        debug('probe transport "%s" failed', name);
        var err = new Error('probe error');
        err.transport = transport.name;
        self.emit('error', err);
      }
    });
  });

  transport.once('error', onerror);
  function onerror(err) {
    if (failed) return;

    // Any callback called by transport should be ignored since now
    failed = true;

    var error = new Error('probe error: ' + err);
    error.transport = transport.name;

    transport.close();
    transport = null;

    debug('probe transport "%s" failed because of error: %s', name, err);

    self.emit('error', error);
  };

  transport.open();

  this.once('close', function () {
    if (transport) {
      debug('socket closed prematurely - aborting probe');
      failed = true;
      transport.close();
      transport = null;
    }
  });

  this.once('upgrading', function (to) {
    if (transport && to.name != transport.name) {
      debug('"%s" works - aborting "%s"', to.name, transport.name);
      transport.close();
      transport = null;
    }
  });
};

/**
 * Called when connection is deemed open.
 *
 * @api public
 */

Socket.prototype.onOpen = function () {
  debug('socket open');
  this.readyState = 'open';
  this.emit('open');
  this.onopen && this.onopen.call(this);
  this.flush();

  // we check for `readyState` in case an `open`
  // listener alreay closed the socket
  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
    debug('starting upgrade probes');
    for (var i = 0, l = this.upgrades.length; i < l; i++) {
      this.probe(this.upgrades[i]);
    }
  }
};

/**
 * Handles a packet.
 *
 * @api private
 */

Socket.prototype.onPacket = function (packet) {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

    this.emit('packet', packet);

    // Socket is live - any packet counts
    this.emit('heartbeat');

    switch (packet.type) {
      case 'open':
        this.onHandshake(util.parseJSON(packet.data));
        break;

      case 'pong':
        this.ping();
        break;

      case 'error':
        var err = new Error('server error');
        err.code = packet.data;
        this.emit('error', err);
        break;

      case 'message':
        this.emit('data', packet.data);
        this.emit('message', packet.data);
        var event = { data: packet.data };
        event.toString = function () {
          return packet.data;
        };
        this.onmessage && this.onmessage.call(this, event);
        break;
    }
  } else {
    debug('packet received with socket readyState "%s"', this.readyState);
  }
};

/**
 * Called upon handshake completion.
 *
 * @param {Object} handshake obj
 * @api private
 */

Socket.prototype.onHandshake = function (data) {
  this.emit('handshake', data);
  this.id = data.sid;
  this.transport.query.sid = data.sid;
  this.upgrades = this.filterUpgrades(data.upgrades);
  this.pingInterval = data.pingInterval;
  this.pingTimeout = data.pingTimeout;
  this.onOpen();
  this.ping();

  // Prolong liveness of socket on heartbeat
  this.removeListener('heartbeat', this.onHeartbeat);
  this.on('heartbeat', this.onHeartbeat);
};

/**
 * Resets ping timeout.
 *
 * @api private
 */

Socket.prototype.onHeartbeat = function (timeout) {
  clearTimeout(this.pingTimeoutTimer);
  var self = this;
  self.pingTimeoutTimer = setTimeout(function () {
    if ('closed' == self.readyState) return;
    self.onClose('ping timeout');
  }, timeout || (self.pingInterval + self.pingTimeout));
};

/**
 * Pings server every `this.pingInterval` and expects response
 * within `this.pingTimeout` or closes connection.
 *
 * @api private
 */

Socket.prototype.ping = function () {
  var self = this;
  clearTimeout(self.pingIntervalTimer);
  self.pingIntervalTimer = setTimeout(function () {
    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
    self.sendPacket('ping');
    self.onHeartbeat(self.pingTimeout);
  }, self.pingInterval);
};

/**
 * Called on `drain` event
 * 
 * @api private
 */

 Socket.prototype.onDrain = function() {
  this.callbacks();
  this.writeBuffer.splice(0, this.prevBufferLen);
  this.callbackBuffer.splice(0, this.prevBufferLen);
  // setting prevBufferLen = 0 is very important
  // for example, when upgrading, upgrade packet is sent over,
  // and a nonzero prevBufferLen could cause problems on `drain`
  this.prevBufferLen = 0;
  if (this.writeBuffer.length == 0) {
    this.emit('drain');
  } else {
    this.flush();
  }
 }

/**
 * Calls all the callback functions associated with sending packets
 * 
 * @api private
 */

Socket.prototype.callbacks = function() {
  for (var i = 0; i < this.prevBufferLen; i++) {
    if (this.callbackBuffer[i]) {
      this.callbackBuffer[i]();
    }
  }
}

/**
 * Flush write buffers.
 *
 * @api private
 */

Socket.prototype.flush = function () {
  if ('closed' != this.readyState && this.transport.writable &&
    !this.upgrading && this.writeBuffer.length) {
    debug('flushing %d packets in socket', this.writeBuffer.length);
    this.transport.send(this.writeBuffer);
    // keep track of current length of writeBuffer
    // splice writeBuffer and callbackBuffer on `drain`
    this.prevBufferLen = this.writeBuffer.length;
    this.emit('flush');
  }
};

/**
 * Sends a message.
 *
 * @param {String} message.
 * @param {Function} callback function.
 * @return {Socket} for chaining.
 * @api public
 */

Socket.prototype.write =
Socket.prototype.send = function (msg, fn) {
  this.sendPacket('message', msg, fn);
  return this;
};

/**
 * Sends a packet.
 *
 * @param {String} packet type.
 * @param {String} data.
 * @param {Function} callback function.
 * @api private
 */

Socket.prototype.sendPacket = function (type, data, fn) {
  var packet = { type: type, data: data };
  this.emit('packetCreate', packet);
  this.writeBuffer.push(packet);
  this.callbackBuffer.push(fn);
  this.flush();
};

/**
 * Closes the connection.
 *
 * @api private
 */

Socket.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.onClose('forced close');
    debug('socket closing - telling transport to close');
    this.transport.close();
    this.transport.removeAllListeners();
  }

  return this;
};

/**
 * Called upon transport error
 *
 * @api private
 */

Socket.prototype.onError = function (err) {
  debug('socket error %j', err);
  this.emit('error', err);
  this.onClose('transport error', err);
};

/**
 * Called upon transport close.
 *
 * @api private
 */

Socket.prototype.onClose = function (reason, desc) {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    debug('socket close with reason: "%s"', reason);
    var self = this;
    clearTimeout(this.pingIntervalTimer);
    clearTimeout(this.pingTimeoutTimer);
    // clean buffers in next tick, so developers can still
    // grab the buffers on `close` event
    setTimeout(function() {
      self.writeBuffer = [];
      self.callbackBuffer = [];
    }, 0);
    this.readyState = 'closed';
    this.emit('close', reason, desc);
    this.onclose && this.onclose.call(this);
    this.id = null;
  }
};

/**
 * Filters upgrades, returning only those matching client transports.
 *
 * @param {Array} server upgrades
 * @api private
 *
 */

Socket.prototype.filterUpgrades = function (upgrades) {
  var filteredUpgrades = [];
  for (var i = 0, j = upgrades.length; i<j; i++) {
    if (~this.transports.indexOf(upgrades[i])) filteredUpgrades.push(upgrades[i]);
  }
  return filteredUpgrades;
};

});
require.register("LearnBoost-engine.io-client/lib/transport.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var util = require('./util')
  , parser = require('engine.io-parser')
  , Emitter = require('./emitter');

/**
 * Module exports.
 */

module.exports = Transport;

/**
 * Transport abstract constructor.
 *
 * @param {Object} options.
 * @api private
 */

function Transport (opts) {
  this.path = opts.path;
  this.hostname = opts.hostname;
  this.port = opts.port;
  this.secure = opts.secure;
  this.query = opts.query;
  this.timestampParam = opts.timestampParam;
  this.timestampRequests = opts.timestampRequests;
  this.readyState = '';
};

/**
  * Mix in `Emitter`.
 */

Emitter(Transport.prototype);

/**
 * Emits an error.
 *
 * @param {String} str
 * @return {Transport} for chaining
 * @api public
 */

Transport.prototype.onError = function (msg, desc) {
  var err = new Error(msg);
  err.type = 'TransportError';
  err.description = desc;
  this.emit('error', err);
  return this;
};

/**
 * Opens the transport.
 *
 * @api public
 */

Transport.prototype.open = function () {
  if ('closed' == this.readyState || '' == this.readyState) {
    this.readyState = 'opening';
    this.doOpen();
  }

  return this;
};

/**
 * Closes the transport.
 *
 * @api private
 */

Transport.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.doClose();
    this.onClose();
  }

  return this;
};

/**
 * Sends multiple packets.
 *
 * @param {Array} packets
 * @api private
 */

Transport.prototype.send = function(packets){
  if ('open' == this.readyState) {
    this.write(packets);
  } else {
    throw new Error('Transport not open');
  }
};

/**
 * Called upon open
 *
 * @api private
 */

Transport.prototype.onOpen = function () {
  this.readyState = 'open';
  this.writable = true;
  this.emit('open');
};

/**
 * Called with data.
 *
 * @param {String} data
 * @api private
 */

Transport.prototype.onData = function (data) {
  this.onPacket(parser.decodePacket(data));
};

/**
 * Called with a decoded packet.
 */

Transport.prototype.onPacket = function (packet) {
  this.emit('packet', packet);
};

/**
 * Called upon close.
 *
 * @api private
 */

Transport.prototype.onClose = function () {
  this.readyState = 'closed';
  this.emit('close');
};

});
require.register("LearnBoost-engine.io-client/lib/emitter.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Emitter = require('emitter');

/**
 * Module exports.
 */

module.exports = Emitter;

/**
 * Compatibility with `WebSocket#addEventListener`.
 *
 * @api public
 */

Emitter.prototype.addEventListener = Emitter.prototype.on;

/**
 * Compatibility with `WebSocket#removeEventListener`.
 *
 * @api public
 */

Emitter.prototype.removeEventListener = Emitter.prototype.off;

/**
 * Node-compatible `EventEmitter#removeListener`
 *
 * @api public
 */

Emitter.prototype.removeListener = Emitter.prototype.off;

});
require.register("LearnBoost-engine.io-client/lib/util.js", function(exports, require, module){
/**
 * Status of page load.
 */

var pageLoaded = false;

/**
 * Returns the global object
 *
 * @api private
 */

exports.global = function () {
  return 'undefined' != typeof window ? window : global;
};

/**
 * Inheritance.
 *
 * @param {Function} ctor a
 * @param {Function} ctor b
 * @api private
 */

exports.inherits = function inherits (a, b) {
  function c () { }
  c.prototype = b.prototype;
  a.prototype = new c;
};

/**
 * Object.keys
 */

exports.keys = Object.keys || function (obj) {
  var ret = [];
  var has = Object.prototype.hasOwnProperty;

  for (var i in obj) {
    if (has.call(obj, i)) {
      ret.push(i);
    }
  }

  return ret;
};

/**
 * Adds an event.
 *
 * @api private
 */

exports.on = function (element, event, fn, capture) {
  if (element.attachEvent) {
    element.attachEvent('on' + event, fn);
  } else if (element.addEventListener) {
    element.addEventListener(event, fn, capture);
  }
};

/**
 * Load utility.
 *
 * @api private
 */

exports.load = function (fn) {
  var global = exports.global();
  if (global.document && document.readyState === 'complete' || pageLoaded) {
    return fn();
  }

  exports.on(global, 'load', fn, false);
};

/**
 * Change the internal pageLoaded value.
 */

if ('undefined' != typeof window) {
  exports.load(function () {
    pageLoaded = true;
  });
}

/**
 * Defers a function to ensure a spinner is not displayed by the browser.
 *
 * @param {Function} fn
 * @api private
 */

exports.defer = function (fn) {
  if (!exports.ua.webkit || 'undefined' != typeof importScripts) {
    return fn();
  }

  exports.load(function () {
    setTimeout(fn, 100);
  });
};

/**
 * JSON parse.
 *
 * @see Based on jQuery#parseJSON (MIT) and JSON2
 * @api private
 */

var rvalidchars = /^[\],:{}\s]*$/;
var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
var rtrimLeft = /^\s+/;
var rtrimRight = /\s+$/;

exports.parseJSON = function (data) {
  var global = exports.global();

  if ('string' != typeof data || !data) {
    return null;
  }

  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

  // Attempt to parse using the native JSON parser first
  if (global.JSON && JSON.parse) {
    return JSON.parse(data);
  }

  if (rvalidchars.test(data.replace(rvalidescape, '@')
      .replace(rvalidtokens, ']')
      .replace(rvalidbraces, ''))) {
    return (new Function('return ' + data))();
  }
};

/**
 * UA / engines detection namespace.
 *
 * @namespace
 */

exports.ua = {};

/**
 * Whether the UA supports CORS for XHR.
 *
 * @api private
 */

exports.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
  var a;
  try {
    a = new XMLHttpRequest();
  } catch (e) {
    return false;
  }

  return a.withCredentials != undefined;
})();

/**
 * Detect webkit.
 *
 * @api private
 */

exports.ua.webkit = 'undefined' != typeof navigator &&
  /webkit/i.test(navigator.userAgent);

/**
 * Detect gecko.
 *
 * @api private
 */

exports.ua.gecko = 'undefined' != typeof navigator &&
  /gecko/i.test(navigator.userAgent);

/**
 * Detect android;
 */

exports.ua.android = 'undefined' != typeof navigator &&
  /android/i.test(navigator.userAgent);

/**
 * Detect iOS.
 */

exports.ua.ios = 'undefined' != typeof navigator &&
  /^(iPad|iPhone|iPod)$/.test(navigator.platform);
exports.ua.ios6 = exports.ua.ios && /OS 6_/.test(navigator.userAgent);

/**
 * XHR request helper.
 *
 * @param {Boolean} whether we need xdomain
 * @api private
 */

exports.request = function request (xdomain) {
  if ('undefined' == typeof window) {
    var _XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
    return new _XMLHttpRequest();
  }

  if (xdomain && 'undefined' != typeof XDomainRequest && !exports.ua.hasCORS) {
    return new XDomainRequest();
  }

  // XMLHttpRequest can be disabled on IE
  try {
    if ('undefined' != typeof XMLHttpRequest && (!xdomain || exports.ua.hasCORS)) {
      return new XMLHttpRequest();
    }
  } catch (e) { }

  if (!xdomain) {
    try {
      return new ActiveXObject('Microsoft.XMLHTTP');
    } catch(e) { }
  }
};

/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

var parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host'
  , 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];

exports.parseUri = function (str) {
  var m = re.exec(str || '')
    , uri = {}
    , i = 14;

  while (i--) {
    uri[parts[i]] = m[i] || '';
  }

  return uri;
};

/**
 * Compiles a querystring
 *
 * @param {Object}
 * @api private
 */

exports.qs = function (obj) {
  var str = '';

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length) str += '&';
      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
    }
  }

  return str;
};

/**
 * Parses a simple querystring.
 *
 * @param {String} qs
 * @api private
 */

exports.qsParse = function(qs){
  var qry = {};
  var pairs = qs.split('&');
  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i].split('=');
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
};

});
require.register("LearnBoost-engine.io-client/lib/transports/index.js", function(exports, require, module){

/**
 * Module dependencies
 */

var XHR = require('./polling-xhr')
  , JSONP = require('./polling-jsonp')
  , websocket = require('./websocket')
  , flashsocket = require('./flashsocket')
  , util = require('../util');

/**
 * Export transports.
 */

exports.polling = polling;
exports.websocket = websocket;
exports.flashsocket = flashsocket;

/**
 * Global reference.
 */

var global = util.global()

/**
 * Polling transport polymorphic constructor.
 * Decides on xhr vs jsonp based on feature detection.
 *
 * @api private
 */

function polling (opts) {
  var xhr
    , xd = false
    , isXProtocol = false;

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (Number(port) != port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.host != location.hostname || port != opts.port;
    isXProtocol = opts.secure != isSSL;
  }

  xhr = util.request(xd);
  /* See #7 at http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx */
  if (isXProtocol && global.XDomainRequest && xhr instanceof global.XDomainRequest) {
    return new JSONP(opts);
  }

  if (xhr && !opts.forceJSONP) {
    return new XHR(opts);
  } else {
    return new JSONP(opts);
  }
};

});
require.register("LearnBoost-engine.io-client/lib/transports/polling.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Transport = require('../transport')
  , util = require('../util')
  , parser = require('engine.io-parser')
  , debug = require('debug')('engine.io-client:polling');

/**
 * Module exports.
 */

module.exports = Polling;

/**
 * Global reference.
 */

var global = util.global();

/**
 * Polling interface.
 *
 * @param {Object} opts
 * @api private
 */

function Polling(opts){
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

util.inherits(Polling, Transport);

/**
 * Transport name.
 */

Polling.prototype.name = 'polling';

/**
 * Opens the socket (triggers polling). We write a PING message to determine
 * when the transport is open.
 *
 * @api private
 */

Polling.prototype.doOpen = function(){
  this.poll();
};

/**
 * Pauses polling.
 *
 * @param {Function} callback upon buffers are flushed and transport is paused
 * @api private
 */

Polling.prototype.pause = function(onPause){
  var pending = 0;
  var self = this;

  this.readyState = 'pausing';

  function pause(){
    debug('paused');
    self.readyState = 'paused';
    onPause();
  }

  if (this.polling || !this.writable) {
    var total = 0;

    if (this.polling) {
      debug('we are currently polling - waiting to pause');
      total++;
      this.once('pollComplete', function(){
        debug('pre-pause polling complete');
        --total || pause();
      });
    }

    if (!this.writable) {
      debug('we are currently writing - waiting to pause');
      total++;
      this.once('drain', function(){
        debug('pre-pause writing complete');
        --total || pause();
      });
    }
  } else {
    pause();
  }
};

/**
 * Starts polling cycle.
 *
 * @api public
 */

Polling.prototype.poll = function(){
  debug('polling');
  this.polling = true;
  this.doPoll();
  this.emit('poll');
};

/**
 * Overloads onData to detect payloads.
 *
 * @api private
 */

Polling.prototype.onData = function(data){
  var self = this;
  debug('polling got data %s', data);

  // decode payload
  parser.decodePayload(data, function(packet, index, total) {
    // if its the first message we consider the transport open
    if ('opening' == self.readyState) {
      self.onOpen();
    }

    // if its a close packet, we close the ongoing requests
    if ('close' == packet.type) {
      self.onClose();
      return false;
    }

    // otherwise bypass onData and handle the message
    self.onPacket(packet);
  });

  // if an event did not trigger closing
  if ('closed' != this.readyState) {
    // if we got data we're not polling
    this.polling = false;
    this.emit('pollComplete');

    if ('open' == this.readyState) {
      this.poll();
    } else {
      debug('ignoring poll - transport state "%s"', this.readyState);
    }
  }
};

/**
 * For polling, send a close packet.
 *
 * @api private
 */

Polling.prototype.doClose = function(){
  debug('sending close packet');
  this.send([{ type: 'close' }]);
};

/**
 * Writes a packets payload.
 *
 * @param {Array} data packets
 * @param {Function} drain callback
 * @api private
 */

Polling.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  this.doWrite(parser.encodePayload(packets), function(){
    self.writable = true;
    self.emit('drain');
  });
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

Polling.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'https' : 'http';
  var port = '';

  // cache busting is forced for IE / android / iOS6 ಠ_ಠ
  if (global.ActiveXObject || util.ua.android || util.ua.ios6 ||
      this.timestampRequests) {
    query[this.timestampParam] = +new Date;
  }

  query = util.qs(query);

  // avoid port if default for schema
  if (this.port && (('https' == schema && this.port != 443) ||
     ('http' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

});
require.register("LearnBoost-engine.io-client/lib/transports/polling-xhr.js", function(exports, require, module){
/**
 * Module requirements.
 */

var Polling = require('./polling')
  , util = require('../util')
  , Emitter = require('../emitter')
  , debug = require('debug')('engine.io-client:polling-xhr');

/**
 * Module exports.
 */

module.exports = XHR;
module.exports.Request = Request;

/**
 * Global reference.
 */

var global = util.global();


/**
 * Obfuscated key for Blue Coat.
 */

var xobject = global[['Active'].concat('Object').join('X')];

/**
 * Empty function
 */

function empty(){}

/**
 * XHR Polling constructor.
 *
 * @param {Object} opts
 * @api public
 */

function XHR(opts){
  Polling.call(this, opts);

  if (global.location) {
    this.xd = opts.host != global.location.hostname ||
      global.location.port != opts.port;
  }
};

/**
 * Inherits from Polling.
 */

util.inherits(XHR, Polling);

/**
 * Opens the socket
 *
 * @api private
 */

XHR.prototype.doOpen = function(){
  var self = this;
  util.defer(function(){
    Polling.prototype.doOpen.call(self);
  });
};

/**
 * Creates a request.
 *
 * @param {String} method
 * @api private
 */

XHR.prototype.request = function(opts){
  opts = opts || {};
  opts.uri = this.uri();
  opts.xd = this.xd;
  return new Request(opts);
};

/**
 * Sends data.
 *
 * @param {String} data to send.
 * @param {Function} called upon flush.
 * @api private
 */

XHR.prototype.doWrite = function(data, fn){
  var req = this.request({ method: 'POST', data: data });
  var self = this;
  req.on('success', fn);
  req.on('error', function(err){
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

XHR.prototype.doPoll = function(){
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function(data){
    self.onData(data);
  });
  req.on('error', function(err){
    self.onError('xhr poll error', err);
  });
  this.pollXhr = req;
};

/**
 * Request constructor
 *
 * @param {Object} options
 * @api public
 */

function Request(opts){
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.async = false !== opts.async;
  this.data = undefined != opts.data ? opts.data : null;
  this.create();
}

/**
 * Mix in `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Creates the XHR object and sends the request.
 *
 * @api private
 */

Request.prototype.create = function(){
  var xhr = this.xhr = util.request(this.xd);
  var self = this;

  xhr.open(this.method, this.uri, this.async);

  if ('POST' == this.method) {
    try {
      if (xhr.setRequestHeader) {
        // xmlhttprequest
        xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
      } else {
        // xdomainrequest
        xhr.contentType = 'text/plain';
      }
    } catch (e) {}
  }

  if (this.xd && global.XDomainRequest && xhr instanceof XDomainRequest) {
    xhr.onerror = function(e){
      self.onError(e);
    };
    xhr.onload = function(){
      self.onData(xhr.responseText);
    };
    xhr.onprogress = empty;
  } else {
    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = true;
    }

    xhr.onreadystatechange = function(){
      var data;

      try {
        if (4 != xhr.readyState) return;
        if (200 == xhr.status || 1223 == xhr.status) {
          data = xhr.responseText;
        } else {
          self.onError(xhr.status);
        }
      } catch (e) {
        self.onError(e);
      }

      if (undefined !== data) {
        self.onData(data);
      }
    };
  }

  debug('sending xhr with url %s | data %s', this.uri, this.data);
  xhr.send(this.data);

  if (xobject) {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function(){
  this.emit('success');
  this.cleanup();
};

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function(data){
  this.emit('data', data);
  this.onSuccess();
};

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function(err){
  this.emit('error', err);
  this.cleanup();
};

/**
 * Cleans up house.
 *
 * @api private
 */

Request.prototype.cleanup = function(){
  if ('undefined' == typeof this.xhr ) {
    return;
  }
  // xmlhttprequest
  this.xhr.onreadystatechange = empty;

  // xdomainrequest
  this.xhr.onload = this.xhr.onerror = empty;

  try {
    this.xhr.abort();
  } catch(e) {}

  if (xobject) {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};

/**
 * Aborts the request.
 *
 * @api public
 */

Request.prototype.abort = function(){
  this.cleanup();
};

if (xobject) {
  Request.requestsCount = 0;
  Request.requests = {};

  global.attachEvent('onunload', function(){
    for (var i in Request.requests) {
      if (Request.requests.hasOwnProperty(i)) {
        Request.requests[i].abort();
      }
    }
  });
}

});
require.register("LearnBoost-engine.io-client/lib/transports/polling-jsonp.js", function(exports, require, module){

/**
 * Module requirements.
 */

var Polling = require('./polling')
  , util = require('../util');

/**
 * Module exports.
 */

module.exports = JSONPPolling;

/**
 * Global reference.
 */

var global = util.global();

/**
 * Cached regular expressions.
 */

var rNewline = /\n/g;

/**
 * Global JSONP callbacks.
 */

var callbacks;

/**
 * Callbacks count.
 */

var index = 0;

/**
 * Noop.
 */

function empty () { }

/**
 * JSONP Polling constructor.
 *
 * @param {Object} opts.
 * @api public
 */

function JSONPPolling (opts) {
  Polling.call(this, opts);

  // define global callbacks array if not present
  // we do this here (lazily) to avoid unneeded global pollution
  if (!callbacks) {
    // we need to consider multiple engines in the same page
    if (!global.___eio) global.___eio = [];
    callbacks = global.___eio;
  }

  // callback identifier
  this.index = callbacks.length;

  // add callback to jsonp global
  var self = this;
  callbacks.push(function (msg) {
    self.onData(msg);
  });

  // append to query string
  this.query.j = this.index;
};

/**
 * Inherits from Polling.
 */

util.inherits(JSONPPolling, Polling);

/**
 * Opens the socket.
 *
 * @api private
 */

JSONPPolling.prototype.doOpen = function () {
  var self = this;
  util.defer(function () {
    Polling.prototype.doOpen.call(self);
  });
};

/**
 * Closes the socket
 *
 * @api private
 */

JSONPPolling.prototype.doClose = function () {
  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  if (this.form) {
    this.form.parentNode.removeChild(this.form);
    this.form = null;
  }

  Polling.prototype.doClose.call(this);
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

JSONPPolling.prototype.doPoll = function () {
	var self = this;
  var script = document.createElement('script');

  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  script.async = true;
  script.src = this.uri();
	script.onerror = function(e){
		self.onError('jsonp poll error',e);
	}

  var insertAt = document.getElementsByTagName('script')[0];
  insertAt.parentNode.insertBefore(script, insertAt);
  this.script = script;


  if (util.ua.gecko) {
    setTimeout(function () {
      var iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      document.body.removeChild(iframe);
    }, 100);
  }
};

/**
 * Writes with a hidden iframe.
 *
 * @param {String} data to send
 * @param {Function} called upon flush.
 * @api private
 */

JSONPPolling.prototype.doWrite = function (data, fn) {
  var self = this;

  if (!this.form) {
    var form = document.createElement('form');
    var area = document.createElement('textarea');
    var id = this.iframeId = 'eio_iframe_' + this.index;
    var iframe;

    form.className = 'socketio';
    form.style.position = 'absolute';
    form.style.top = '-1000px';
    form.style.left = '-1000px';
    form.target = id;
    form.method = 'POST';
    form.setAttribute('accept-charset', 'utf-8');
    area.name = 'd';
    form.appendChild(area);
    document.body.appendChild(form);

    this.form = form;
    this.area = area;
  }

  this.form.action = this.uri();

  function complete () {
    initIframe();
    fn();
  };

  function initIframe () {
    if (self.iframe) {
      try {
        self.form.removeChild(self.iframe);
      } catch (e) {
        self.onError('jsonp polling iframe removal error', e);
      }
    }

    try {
      // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
      var html = '<iframe src="javascript:0" name="'+ self.iframeId +'">';
      iframe = document.createElement(html);
    } catch (e) {
      iframe = document.createElement('iframe');
      iframe.name = self.iframeId;
      iframe.src = 'javascript:0';
    }

    iframe.id = self.iframeId;

    self.form.appendChild(iframe);
    self.iframe = iframe;
  };

  initIframe();

  // escape \n to prevent it from being converted into \r\n by some UAs
  this.area.value = data.replace(rNewline, '\\n');

  try {
    this.form.submit();
  } catch(e) {}

  if (this.iframe.attachEvent) {
    this.iframe.onreadystatechange = function(){
      if (self.iframe.readyState == 'complete') {
        complete();
      }
    };
  } else {
    this.iframe.onload = complete;
  }
};

});
require.register("LearnBoost-engine.io-client/lib/transports/websocket.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Transport = require('../transport')
  , parser = require('engine.io-parser')
  , util = require('../util')
  , debug = require('debug')('engine.io-client:websocket');

/**
 * Module exports.
 */

module.exports = WS;

/**
 * Global reference.
 */

var global = util.global();

/**
 * WebSocket transport constructor.
 *
 * @api {Object} connection options
 * @api public
 */

function WS(opts){
  Transport.call(this, opts);
};

/**
 * Inherits from Transport.
 */

util.inherits(WS, Transport);

/**
 * Transport name.
 *
 * @api public
 */

WS.prototype.name = 'websocket';

/**
 * Opens socket.
 *
 * @api private
 */

WS.prototype.doOpen = function(){
  if (!this.check()) {
    // let probe timeout
    return;
  }

  var self = this;

  this.socket = new (ws())(this.uri());
  this.socket.onopen = function(){
    self.onOpen();
  };
  this.socket.onclose = function(){
    self.onClose();
  };
  this.socket.onmessage = function(ev){
    self.onData(ev.data);
  };
  this.socket.onerror = function(e){
    self.onError('websocket error', e);
  };
};

/**
 * Writes data to socket.
 *
 * @param {Array} array of packets.
 * @api private
 */

WS.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  // encodePacket efficient as it uses WS framing
  // no need for encodePayload
  for (var i = 0, l = packets.length; i < l; i++) {
    this.socket.send(parser.encodePacket(packets[i]));
  }
  function ondrain() {
    self.writable = true;
    self.emit('drain');
  }
  // check periodically if we're done sending
  if ('bufferedAmount' in this.socket) {
    this.bufferedAmountId = setInterval(function() {
      if (self.socket.bufferedAmount == 0) {
        clearInterval(self.bufferedAmountId);
        ondrain();
      }
    }, 50);
  } else {
    // fake drain
    // defer to next tick to allow Socket to clear writeBuffer
    setTimeout(ondrain, 0);
  }
};

/**
 * Called upon close
 *
 * @api private
 */

WS.prototype.onClose = function(){
  // stop checking to see if websocket is done sending buffer
  clearInterval(this.bufferedAmountId);
  Transport.prototype.onClose.call(this);
}

/**
 * Closes socket.
 *
 * @api private
 */

WS.prototype.doClose = function(){
  if (typeof this.socket !== 'undefined') {
    this.socket.close();
  }
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

WS.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'wss' : 'ws';
  var port = '';

  // avoid port if default for schema
  if (this.port && (('wss' == schema && this.port != 443)
    || ('ws' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // append timestamp to URI
  if (this.timestampRequests) {
    query[this.timestampParam] = +new Date;
  }

  query = util.qs(query);

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

/**
 * Feature detection for WebSocket.
 *
 * @return {Boolean} whether this transport is available.
 * @api public
 */

WS.prototype.check = function(){
  var websocket = ws();
  return !!websocket && !('__initialize' in websocket && this.name === WS.prototype.name);
};

/**
 * Getter for WS constructor.
 *
 * @api private
 */

function ws(){
  if ('undefined' == typeof window) {
    return require('ws');
  }

  return global.WebSocket || global.MozWebSocket;
}

});
require.register("LearnBoost-engine.io-client/lib/transports/flashsocket.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var WS = require('./websocket')
  , util = require('../util')
  , debug = require('debug')('engine.io-client:flashsocket');

/**
 * Module exports.
 */

module.exports = FlashWS;

/**
 * Global reference.
 */

var global = util.global()

/**
 * Obfuscated key for Blue Coat.
 */

var xobject = global[['Active'].concat('Object').join('X')];

/**
 * FlashWS constructor.
 *
 * @api public
 */

function FlashWS (options) {
  WS.call(this, options);
  this.flashPath = options.flashPath;
  this.policyPort = options.policyPort;
};

/**
 * Inherits from WebSocket.
 */

util.inherits(FlashWS, WS);

/**
 * Transport name.
 *
 * @api public
 */

FlashWS.prototype.name = 'flashsocket';

/**
 * Opens the transport.
 *
 * @api public
 */

FlashWS.prototype.doOpen = function () {
  if (!this.check()) {
    // let the probe timeout
    return;
  }

  // instrument websocketjs logging
  function log (type) {
    return function(){
      var str = Array.prototype.join.call(arguments, ' ');
      debug('[websocketjs %s] %s', type, str);
    };
  };

  WEB_SOCKET_LOGGER = { log: log('debug'), error: log('error') };
  WEB_SOCKET_SUPPRESS_CROSS_DOMAIN_SWF_ERROR = true;
  WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;

  if ('undefined' == typeof WEB_SOCKET_SWF_LOCATION) {
    WEB_SOCKET_SWF_LOCATION = this.flashPath + 'WebSocketMainInsecure.swf';
  }

  // dependencies
  var deps = [this.flashPath + 'web_socket.js'];

  if ('undefined' == typeof swfobject) {
    deps.unshift(this.flashPath + 'swfobject.js');
  }

  var self = this;

  load(deps, function () {
    self.ready(function () {
      WebSocket.__addTask(function () {
        WS.prototype.doOpen.call(self);
      });
    });
  });
};

/**
 * Override to prevent closing uninitialized flashsocket.
 *
 * @api private
 */

FlashWS.prototype.doClose = function () {
  if (!this.socket) return;
  var self = this;
  WebSocket.__addTask(function() {
    WS.prototype.doClose.call(self);
  });
};

/**
 * Writes to the Flash socket.
 *
 * @api private
 */

FlashWS.prototype.write = function() {
  var self = this, args = arguments;
  WebSocket.__addTask(function () {
    WS.prototype.write.apply(self, args);
  });
};

/**
 * Called upon dependencies are loaded.
 *
 * @api private
 */

FlashWS.prototype.ready = function (fn) {
  if (typeof WebSocket == 'undefined' ||
    !('__initialize' in WebSocket) || !swfobject) {
    return;
  }

  if (swfobject.getFlashPlayerVersion().major < 10) {
    return;
  }

  function init () {
    // Only start downloading the swf file when the checked that this browser
    // actually supports it
    if (!FlashWS.loaded) {
      if (843 != self.policyPort) {
        WebSocket.loadFlashPolicyFile('xmlsocket://' + self.host + ':' + self.policyPort);
      }

      WebSocket.__initialize();
      FlashWS.loaded = true;
    }

    fn.call(self);
  }

  var self = this;
  if (document.body) {
    return init();
  }

  util.load(init);
};

/**
 * Feature detection for flashsocket.
 *
 * @return {Boolean} whether this transport is available.
 * @api public
 */

FlashWS.prototype.check = function () {
  if ('undefined' == typeof window) {
    return false;
  }

  if (typeof WebSocket != 'undefined' && !('__initialize' in WebSocket)) {
    return false;
  }

  if (xobject) {
    var control = null;
    try {
      control = new xobject('ShockwaveFlash.ShockwaveFlash');
    } catch (e) { }
    if (control) {
      return true;
    }
  } else {
    for (var i = 0, l = navigator.plugins.length; i < l; i++) {
      for (var j = 0, m = navigator.plugins[i].length; j < m; j++) {
        if (navigator.plugins[i][j].description == 'Shockwave Flash') {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Lazy loading of scripts.
 * Based on $script by Dustin Diaz - MIT
 */

var scripts = {};

/**
 * Injects a script. Keeps tracked of injected ones.
 *
 * @param {String} path
 * @param {Function} callback
 * @api private
 */

function create (path, fn) {
  if (scripts[path]) return fn();

  var el = document.createElement('script');
  var loaded = false;

  debug('loading "%s"', path);
  el.onload = el.onreadystatechange = function () {
    if (loaded || scripts[path]) return;
    var rs = el.readyState;
    if (!rs || 'loaded' == rs || 'complete' == rs) {
      debug('loaded "%s"', path);
      el.onload = el.onreadystatechange = null;
      loaded = true;
      scripts[path] = true;
      fn();
    }
  };

  el.async = 1;
  el.src = path;

  var head = document.getElementsByTagName('head')[0];
  head.insertBefore(el, head.firstChild);
};

/**
 * Loads scripts and fires a callback.
 *
 * @param {Array} paths
 * @param {Function} callback
 */

function load (arr, fn) {
  function process (i) {
    if (!arr[i]) return fn();
    create(arr[i], function () {
      process(++i);
    });
  };

  process(0);
};

});
require.register("wearefractal-protosock/dist/main.js", function(exports, require, module){
// Generated by CoffeeScript 1.4.0
(function() {
  var Client, Server, defaultClient, defaultServer, ps, util;

  util = require('./util');

  Client = require('./Client');

  defaultClient = require('./defaultClient');

  ps = {
    createClientWrapper: function(plugin) {
      return function(opt) {
        return ps.createClient(plugin, opt);
      };
    },
    createClient: function(plugin, opt) {
      var newPlugin;
      newPlugin = util.mergePlugins(defaultClient, plugin);
      return new Client(newPlugin, opt);
    }
  };

  if (!(typeof window !== "undefined" && window !== null)) {
    Server = require('./Server');
    defaultServer = require('./defaultServer');
    require("http").globalAgent.maxSockets = 999;
    ps.createServer = function(httpServer, plugin, opt) {
      var newPlugin;
      newPlugin = util.mergePlugins(defaultServer, plugin);
      return new Server(httpServer, newPlugin, opt);
    };
    ps.createServerWrapper = function(plugin) {
      return function(httpServer, opt) {
        return ps.createServer(httpServer, plugin, opt);
      };
    };
  }

  module.exports = ps;

}).call(this);

});
require.register("wearefractal-protosock/dist/Socket.js", function(exports, require, module){
// Generated by CoffeeScript 1.4.0
(function() {
  var sock;

  sock = {
    write: function(msg) {
      var _this = this;
      this.parent.outbound(this, msg, function(fmt) {
        return _this.send(fmt);
      });
      return this;
    },
    disconnect: function(r) {
      this.close(r);
      return this;
    }
  };

  module.exports = sock;

}).call(this);

});
require.register("wearefractal-protosock/dist/util.js", function(exports, require, module){
// Generated by CoffeeScript 1.4.0
(function() {
  var nu, util,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  nu = require('./Socket');

  util = {
    extendSocket: function(Socket) {
      return __extends(Socket.prototype, nu);
    },
    mergePlugins: function() {
      var args, k, newPlugin, plugin, v, _i, _len;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      newPlugin = {};
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        plugin = args[_i];
        for (k in plugin) {
          v = plugin[k];
          if (typeof v === 'object' && k !== 'server') {
            newPlugin[k] = util.mergePlugins(newPlugin[k], v);
          } else {
            newPlugin[k] = v;
          }
        }
      }
      return newPlugin;
    }
  };

  module.exports = util;

}).call(this);

});
require.register("wearefractal-protosock/dist/defaultClient.js", function(exports, require, module){
// Generated by CoffeeScript 1.4.0
(function() {
  var def;

  def = {
    options: {},
    start: function() {},
    inbound: function(socket, msg, done) {
      var parsed;
      try {
        parsed = JSON.parse(msg);
      } catch (e) {
        this.error(socket, e);
      }
      done(parsed);
    },
    outbound: function(socket, msg, done) {
      var parsed;
      try {
        parsed = JSON.stringify(msg);
      } catch (e) {
        this.error(socket, e);
      }
      done(parsed);
    },
    validate: function(socket, msg, done) {
      return done(true);
    },
    invalid: function() {},
    connect: function() {},
    message: function() {},
    error: function() {},
    close: function() {}
  };

  if (typeof window !== "undefined" && window !== null) {
    def.options = {
      host: window.location.hostname,
      port: (window.location.port.length > 0 ? parseInt(window.location.port) : 80),
      secure: window.location.protocol === 'https:'
    };
    if (def.options.secure) {
      def.options.port = 443;
    }
  }

  module.exports = def;

}).call(this);

});
require.register("wearefractal-protosock/dist/Client.js", function(exports, require, module){
// Generated by CoffeeScript 1.4.0
(function() {
  var Client, EventEmitter, engineClient, getDelay, util,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  util = require('./util');

  if (typeof window !== "undefined" && window !== null) {
    engineClient = require('engine.io');
    EventEmitter = require('emitter');
  } else {
    engineClient = require('engine.io-client');
    EventEmitter = require('events').EventEmitter;
  }

  util.extendSocket(engineClient.Socket);

  getDelay = function(a) {
    if (a > 10) {
      return 15000;
    } else if (a > 5) {
      return 5000;
    } else if (a > 3) {
      return 1000;
    }
    return 1000;
  };

  Client = (function(_super) {

    __extends(Client, _super);

    function Client(plugin, options) {
      var eiopts, k, v, _base, _base1, _base2, _ref, _ref1, _ref2;
      if (options == null) {
        options = {};
      }
      this.reconnect = __bind(this.reconnect, this);

      this.handleClose = __bind(this.handleClose, this);

      this.handleError = __bind(this.handleError, this);

      this.handleMessage = __bind(this.handleMessage, this);

      this.handleConnection = __bind(this.handleConnection, this);

      for (k in plugin) {
        v = plugin[k];
        this[k] = v;
      }
      for (k in options) {
        v = options[k];
        this.options[k] = v;
      }
      if ((_ref = (_base = this.options).reconnect) == null) {
        _base.reconnect = true;
      }
      if ((_ref1 = (_base1 = this.options).reconnectLimit) == null) {
        _base1.reconnectLimit = Infinity;
      }
      if ((_ref2 = (_base2 = this.options).reconnectTimeout) == null) {
        _base2.reconnectTimeout = Infinity;
      }
      this.isServer = false;
      this.isClient = true;
      this.isBrowser = typeof window !== "undefined" && window !== null;
      eiopts = {
        host: this.options.host,
        port: this.options.port,
        secure: this.options.secure,
        path: "/" + this.options.namespace,
        resource: this.options.resource,
        transports: this.options.transports,
        upgrade: this.options.upgrade,
        flashPath: this.options.flashPath,
        policyPort: this.options.policyPort,
        forceJSONP: this.options.forceJSONP,
        forceBust: this.options.forceBust,
        debug: this.options.debug
      };
      this.ssocket = new engineClient(eiopts);
      this.ssocket.parent = this;
      this.ssocket.once('open', this.handleConnection);
      this.ssocket.on('error', this.handleError);
      this.ssocket.on('message', this.handleMessage);
      this.ssocket.on('close', this.handleClose);
      this.start();
      return;
    }

    Client.prototype.disconnect = function() {
      this.ssocket.disconnect();
      return this;
    };

    Client.prototype.destroy = function() {
      this.options.reconnect = false;
      this.ssocket.disconnect();
      this.emit("destroyed");
      return this;
    };

    Client.prototype.handleConnection = function() {
      this.emit('connected');
      return this.connect(this.ssocket);
    };

    Client.prototype.handleMessage = function(msg) {
      var _this = this;
      this.emit('inbound', this.ssocket, msg);
      return this.inbound(this.ssocket, msg, function(formatted) {
        return _this.validate(_this.ssocket, formatted, function(valid) {
          if (valid) {
            _this.emit('message', _this.ssocket, formatted);
            return _this.message(_this.ssocket, formatted);
          } else {
            _this.emit('invalid', _this.ssocket, formatted);
            return _this.invalid(_this.ssocket, formatted);
          }
        });
      });
    };

    Client.prototype.handleError = function(err) {
      if (typeof err === 'string') {
        err = new Error(err);
      }
      return this.error(this.ssocket, err);
    };

    Client.prototype.handleClose = function(reason) {
      var _this = this;
      if (this.ssocket.reconnecting) {
        return;
      }
      if (this.options.reconnect) {
        return this.reconnect(function(err) {
          if (err == null) {
            return;
          }
          _this.emit('close', _this.ssocket, reason);
          return _this.close(_this.ssocket, reason);
        });
      } else {
        this.emit('close', this.ssocket, reason);
        return this.close(this.ssocket, reason);
      }
    };

    Client.prototype.reconnect = function(cb) {
      var attempts, connect, done, err, maxAttempts, start, timeout,
        _this = this;
      if (this.ssocket.reconnecting) {
        return cb("Already reconnecting");
      }
      this.ssocket.reconnecting = true;
      if (this.ssocket.readyState === 'open') {
        this.ssocket.disconnect();
      }
      start = Date.now();
      maxAttempts = this.options.reconnectLimit;
      timeout = this.options.reconnectTimeout;
      attempts = 0;
      done = function() {
        _this.ssocket.reconnecting = false;
        _this.emit("reconnected");
        return cb();
      };
      err = function(e) {
        _this.ssocket.reconnecting = false;
        return cb(e);
      };
      this.ssocket.once('open', done);
      connect = function() {
        if (!_this.ssocket.reconnecting) {
          return;
        }
        if (attempts >= maxAttempts) {
          return err("Exceeded max attempts");
        }
        if ((Date.now() - start) > timeout) {
          return err("Timeout on reconnect");
        }
        attempts++;
        _this.ssocket.open();
        return setTimeout(connect, getDelay(attempts));
      };
      return setTimeout(connect, getDelay(attempts));
    };

    return Client;

  })(EventEmitter);

  module.exports = Client;

}).call(this);

});
require.register("component-indexof/index.js", function(exports, require, module){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("particle/dist/main.js", function(exports, require, module){
(function() {

  module.exports = {
    Collector: require('./collector')
  };

  if (typeof window === "undefined" || window === null) {
    module.exports.Stream = require('./stream');
  }

}).call(this);

});
require.register("particle/dist/lodash.js", function(exports, require, module){
/**
 * @license
 * Lo-Dash 1.1.0 (Custom Build) <http://lodash.com/>
 * Build: `lodash exports="commonjs" include="find,extend,clone,without,pick,keys" -o dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.4.4 <http://underscorejs.org/>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window) {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports;

  /** Detect free variable `global` and use it as `window` */
  var freeGlobal = typeof global == 'object' && global;
  if (freeGlobal.global === freeGlobal) {
    window = freeGlobal;
  }

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used internally to indicate various things */
  var indicatorObject = {};

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-7.8.6
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to match HTML characters */
  var reUnescapedHtml = /[&<>"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to fix the JScript [[DontEnum]] bug */
  var shadowedProps = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /** Used for `Array` and `Object` method references */
  var arrayRef = Array(),
      objectRef = Object();

  /** Used to restore the original `_` reference in `noConflict` */
  var oldDash = window._;

  /** Used to detect if a method is native */
  var reNative = RegExp('^' +
    String(objectRef.valueOf)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
  );

  /** Native method shortcuts */
  var ceil = Math.ceil,
      clearTimeout = window.clearTimeout,
      concat = arrayRef.concat,
      floor = Math.floor,
      hasOwnProperty = objectRef.hasOwnProperty,
      push = arrayRef.push,
      setTimeout = window.setTimeout,
      toString = objectRef.toString;

  /* Native method shortcuts for methods with the same name as other `lodash` methods */
  var nativeBind = reNative.test(nativeBind = slice.bind) && nativeBind,
      nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
      nativeIsFinite = window.isFinite,
      nativeIsNaN = window.isNaN,
      nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys,
      nativeMax = Math.max,
      nativeMin = Math.min,
      nativeRandom = Math.random;

  /** Detect various environments */
  var isIeOpera = reNative.test(window.attachEvent),
      isV8 = nativeBind && !/\n|true/.test(nativeBind + isIeOpera);

  /** Used to lookup a built-in constructor by [[Class]] */
  var ctorByClass = {};
  ctorByClass[arrayClass] = Array;
  ctorByClass[boolClass] = Boolean;
  ctorByClass[dateClass] = Date;
  ctorByClass[objectClass] = Object;
  ctorByClass[numberClass] = Number;
  ctorByClass[regexpClass] = RegExp;
  ctorByClass[stringClass] = String;

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object, that wraps the given `value`, to enable method
   * chaining.
   *
   * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
   * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
   * and `unshift`
   *
   * Chaining is supported in custom builds as long as the `value` method is
   * implicitly or explicitly included in the build.
   *
   * The chainable wrapper functions are:
   * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
   * `compose`, `concat`, `countBy`, `createCallback`, `debounce`, `defaults`,
   * `defer`, `delay`, `difference`, `filter`, `flatten`, `forEach`, `forIn`,
   * `forOwn`, `functions`, `groupBy`, `initial`, `intersection`, `invert`,
   * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
   * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `push`, `range`,
   * `reject`, `rest`, `reverse`, `shuffle`, `slice`, `sort`, `sortBy`, `splice`,
   * `tap`, `throttle`, `times`, `toArray`, `union`, `uniq`, `unshift`, `values`,
   * `where`, `without`, `wrap`, and `zip`
   *
   * The non-chainable wrapper functions are:
   * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `has`,
   * `identity`, `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`,
   * `isElement`, `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`,
   * `isNull`, `isNumber`, `isObject`, `isPlainObject`, `isRegExp`, `isString`,
   * `isUndefined`, `join`, `lastIndexOf`, `mixin`, `noConflict`, `parseInt`,
   * `pop`, `random`, `reduce`, `reduceRight`, `result`, `shift`, `size`, `some`,
   * `sortedIndex`, `runInContext`, `template`, `unescape`, `uniqueId`, and `value`
   *
   * The wrapper functions `first` and `last` return wrapped values when `n` is
   * passed, otherwise they return unwrapped values.
   *
   * @name _
   * @constructor
   * @category Chaining
   * @param {Mixed} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns a `lodash` instance.
   */
  function lodash() {
    // no operation performed
  }

  /**
   * An object used to flag environments features.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  var support = lodash.support = {};

  (function() {
    var ctor = function() { this.x = 1; },
        object = { '0': 1, 'length': 1 },
        props = [];

    ctor.prototype = { 'valueOf': 1, 'y': 1 };
    for (var prop in new ctor) { props.push(prop); }
    for (prop in arguments) { }

    /**
     * Detect if `arguments` objects are `Object` objects (all but Opera < 10.5).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.argsObject = arguments.constructor == Object;

    /**
     * Detect if an `arguments` object's [[Class]] is resolvable (all but Firefox < 4, IE < 9).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.argsClass = isArguments(arguments);

    /**
     * Detect if `prototype` properties are enumerable by default.
     *
     * Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
     * (if the prototype or a property on the prototype has been set)
     * incorrectly sets a function's `prototype` property [[Enumerable]]
     * value to `true`.
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.enumPrototypes = ctor.propertyIsEnumerable('prototype');

    /**
     * Detect if `Function#bind` exists and is inferred to be fast (all but V8).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.fastBind = nativeBind && !isV8;

    /**
     * Detect if `arguments` object indexes are non-enumerable
     * (Firefox < 4, IE < 9, PhantomJS, Safari < 5.1).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.nonEnumArgs = prop != 0;

    /**
     * Detect if properties shadowing those on `Object.prototype` are non-enumerable.
     *
     * In IE < 9 an objects own properties, shadowing non-enumerable ones, are
     * made non-enumerable as well (a.k.a the JScript [[DontEnum]] bug).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.nonEnumShadows = !/valueOf/.test(props);

    /**
     * Detect lack of support for accessing string characters by index.
     *
     * IE < 8 can't access characters by index and IE 8 can only access
     * characters by index on string literals.
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.unindexedChars = ('x'[0] + Object('x')[0]) != 'xx';

    /**
     * Detect if a DOM node's [[Class]] is resolvable (all but IE < 9)
     * and that the JS engine errors when attempting to coerce an object to
     * a string without a `toString` function.
     *
     * @memberOf _.support
     * @type Boolean
     */
    try {
      support.nodeClass = !(toString.call(document) == objectClass && !({ 'toString': 0 } + ''));
    } catch(e) {
      support.nodeClass = true;
    }
  }(1));

  /*--------------------------------------------------------------------------*/

  /**
   * The template used to create iterator functions.
   *
   * @private
   * @param {Obect} data The data object used to populate the text.
   * @returns {String} Returns the interpolated text.
   */
  var iteratorTemplate = function(obj) {

    var __p = 'var index, iterable = ' +
    (obj.firstArg) +
    ', result = ' +
    (obj.init) +
    ';\nif (!iterable) return result;\n' +
    (obj.top) +
    ';\n';
     if (obj.arrays) {
    __p += 'var length = iterable.length; index = -1;\nif (' +
    (obj.arrays) +
    ') {  ';
     if (support.unindexedChars) {
    __p += '\n  if (isString(iterable)) {\n    iterable = iterable.split(\'\')\n  }  ';
     }
    __p += '\n  while (++index < length) {\n    ' +
    (obj.loop) +
    '\n  }\n}\nelse {  ';
      } else if (support.nonEnumArgs) {
    __p += '\n  var length = iterable.length; index = -1;\n  if (length && isArguments(iterable)) {\n    while (++index < length) {\n      index += \'\';\n      ' +
    (obj.loop) +
    '\n    }\n  } else {  ';
     }

     if (support.enumPrototypes) {
    __p += '\n  var skipProto = typeof iterable == \'function\';\n  ';
     }

     if (obj.useHas && obj.useKeys) {
    __p += '\n  var ownIndex = -1,\n      ownProps = objectTypes[typeof iterable] ? keys(iterable) : [],\n      length = ownProps.length;\n\n  while (++ownIndex < length) {\n    index = ownProps[ownIndex];\n    ';
     if (support.enumPrototypes) {
    __p += 'if (!(skipProto && index == \'prototype\')) {\n  ';
     }
    __p += 
    (obj.loop);
     if (support.enumPrototypes) {
    __p += '}\n';
     }
    __p += '  }  ';
     } else {
    __p += '\n  for (index in iterable) {';
        if (support.enumPrototypes || obj.useHas) {
    __p += '\n    if (';
          if (support.enumPrototypes) {
    __p += '!(skipProto && index == \'prototype\')';
     }      if (support.enumPrototypes && obj.useHas) {
    __p += ' && ';
     }      if (obj.useHas) {
    __p += 'hasOwnProperty.call(iterable, index)';
     }
    __p += ') {    ';
     }
    __p += 
    (obj.loop) +
    ';    ';
     if (support.enumPrototypes || obj.useHas) {
    __p += '\n    }';
     }
    __p += '\n  }    ';
     if (support.nonEnumShadows) {
    __p += '\n\n  var ctor = iterable.constructor;\n      ';
     for (var k = 0; k < 7; k++) {
    __p += '\n  index = \'' +
    (obj.shadowedProps[k]) +
    '\';\n  if (';
          if (obj.shadowedProps[k] == 'constructor') {
    __p += '!(ctor && ctor.prototype === iterable) && ';
          }
    __p += 'hasOwnProperty.call(iterable, index)) {\n    ' +
    (obj.loop) +
    '\n  }      ';
     }

     }

     }

     if (obj.arrays || support.nonEnumArgs) {
    __p += '\n}';
     }
    __p += 
    (obj.bottom) +
    ';\nreturn result';

    return __p
  };

  /** Reusable iterator options for `assign` and `defaults` */
  var defaultsIteratorOptions = {
    'args': 'object, source, guard',
    'top':
      'var args = arguments,\n' +
      '    argsIndex = 0,\n' +
      "    argsLength = typeof guard == 'number' ? 2 : args.length;\n" +
      'while (++argsIndex < argsLength) {\n' +
      '  iterable = args[argsIndex];\n' +
      '  if (iterable && objectTypes[typeof iterable]) {',
    'loop': "if (typeof result[index] == 'undefined') result[index] = iterable[index]",
    'bottom': '  }\n}'
  };

  /** Reusable iterator options shared by `each`, `forIn`, and `forOwn` */
  var eachIteratorOptions = {
    'args': 'collection, callback, thisArg',
    'top': "callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg)",
    'arrays': "typeof length == 'number'",
    'loop': 'if (callback(iterable[index], index, collection) === false) return result'
  };

  /** Reusable iterator options for `forIn` and `forOwn` */
  var forOwnIteratorOptions = {
    'top': 'if (!objectTypes[typeof iterable]) return result;\n' + eachIteratorOptions.top,
    'arrays': false
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a function optimized to search large arrays for a given `value`,
   * starting at `fromIndex`, using strict equality for comparisons, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Number} fromIndex The index to search from.
   * @param {Number} largeSize The length at which an array is considered large.
   * @returns {Boolean} Returns `true`, if `value` is found, else `false`.
   */
  function cachedContains(array, fromIndex, largeSize) {
    var length = array.length,
        isLarge = (length - fromIndex) >= largeSize;

    if (isLarge) {
      var cache = {},
          index = fromIndex - 1;

      while (++index < length) {
        // manually coerce `value` to a string because `hasOwnProperty`, in some
        // older versions of Firefox, coerces objects incorrectly
        var key = String(array[index]);
        (hasOwnProperty.call(cache, key) ? cache[key] : (cache[key] = [])).push(array[index]);
      }
    }
    return function(value) {
      if (isLarge) {
        var key = String(value);
        return hasOwnProperty.call(cache, key) && indexOf(cache[key], value) > -1;
      }
      return indexOf(array, value, fromIndex) > -1;
    }
  }

  /**
   * Used by `_.max` and `_.min` as the default `callback` when a given
   * `collection` is a string value.
   *
   * @private
   * @param {String} value The character to inspect.
   * @returns {Number} Returns the code unit of given character.
   */
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }

  /**
   * Used by `sortBy` to compare transformed `collection` values, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {Number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ai = a.index,
        bi = b.index;

    a = a.criteria;
    b = b.criteria;

    // ensure a stable sort in V8 and other engines
    // http://code.google.com/p/v8/issues/detail?id=90
    if (a !== b) {
      if (a > b || typeof a == 'undefined') {
        return 1;
      }
      if (a < b || typeof b == 'undefined') {
        return -1;
      }
    }
    return ai < bi ? -1 : 1;
  }

  /**
   * Creates a function that, when called, invokes `func` with the `this` binding
   * of `thisArg` and prepends any `partialArgs` to the arguments passed to the
   * bound function.
   *
   * @private
   * @param {Function|String} func The function to bind or the method name.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @param {Array} partialArgs An array of arguments to be partially applied.
   * @param {Object} [idicator] Used to indicate binding by key or partially
   *  applying arguments from the right.
   * @returns {Function} Returns the new bound function.
   */
  function createBound(func, thisArg, partialArgs, indicator) {
    var isFunc = isFunction(func),
        isPartial = !partialArgs,
        key = thisArg;

    // juggle arguments
    if (isPartial) {
      var rightIndicator = indicator;
      partialArgs = thisArg;
    }
    else if (!isFunc) {
      if (!indicator) {
        throw new TypeError;
      }
      thisArg = func;
    }

    function bound() {
      // `Function#bind` spec
      // http://es5.github.com/#x15.3.4.5
      var args = arguments,
          thisBinding = isPartial ? this : thisArg;

      if (!isFunc) {
        func = thisArg[key];
      }
      if (partialArgs.length) {
        args = args.length
          ? (args = slice(args), rightIndicator ? args.concat(partialArgs) : partialArgs.concat(args))
          : partialArgs;
      }
      if (this instanceof bound) {
        // ensure `new bound` is an instance of `func`
        noop.prototype = func.prototype;
        thisBinding = new noop;
        noop.prototype = null;

        // mimic the constructor's `return` behavior
        // http://es5.github.com/#x13.2.2
        var result = func.apply(thisBinding, args);
        return isObject(result) ? result : thisBinding;
      }
      return func.apply(thisBinding, args);
    }
    return bound;
  }

  /**
   * Creates compiled iteration functions.
   *
   * @private
   * @param {Object} [options1, options2, ...] The compile options object(s).
   *  arrays - A string of code to determine if the iterable is an array or array-like.
   *  useHas - A boolean to specify using `hasOwnProperty` checks in the object loop.
   *  args - A string of comma separated arguments the iteration function will accept.
   *  top - A string of code to execute before the iteration branches.
   *  loop - A string of code to execute in the object loop.
   *  bottom - A string of code to execute after the iteration branches.
   * @returns {Function} Returns the compiled function.
   */
  function createIterator() {
    var data = {
      // data properties
      'shadowedProps': shadowedProps,
      // iterator options
      'arrays': 'isArray(iterable)',
      'bottom': '',
      'init': 'iterable',
      'loop': '',
      'top': '',
      'useHas': true,
      'useKeys': !!keys
    };

    // merge options into a template data object
    for (var object, index = 0; object = arguments[index]; index++) {
      for (var key in object) {
        data[key] = object[key];
      }
    }
    var args = data.args;
    data.firstArg = /^[^,]+/.exec(args)[0];

    // create the function factory
    var factory = Function(
        'hasOwnProperty, isArguments, isArray, isString, keys, ' +
        'lodash, objectTypes',
      'return function(' + args + ') {\n' + iteratorTemplate(data) + '\n}'
    );
    // return the compiled function
    return factory(
      hasOwnProperty, isArguments, isArray, isString, keys,
      lodash, objectTypes
    );
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Used by `escape` to convert characters to HTML entities.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeHtmlChar(match) {
    return htmlEscapes[match];
  }

  /**
   * Checks if `value` is a DOM node in IE < 9.
   *
   * @private
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a DOM node, else `false`.
   */
  function isNode(value) {
    // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
    // methods that are `typeof` "string" and still can coerce nodes to strings
    return typeof value.toString != 'function' && typeof (value + '') == 'string';
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * Slices the `collection` from the `start` index up to, but not including,
   * the `end` index.
   *
   * Note: This function is used, instead of `Array#slice`, to support node lists
   * in IE < 9 and to ensure dense arrays are returned.
   *
   * @private
   * @param {Array|Object|String} collection The collection to slice.
   * @param {Number} start The start index.
   * @param {Number} end The end index.
   * @returns {Array} Returns the new array.
   */
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1,
        length = end - start || 0,
        result = Array(length < 0 ? 0 : length);

    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }

  /**
   * Used by `unescape` to convert HTML entities to characters.
   *
   * @private
   * @param {String} match The matched character to unescape.
   * @returns {String} Returns the unescaped character.
   */
  function unescapeHtmlChar(match) {
    return htmlUnescapes[match];
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Checks if `value` is an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is an `arguments` object, else `false`.
   * @example
   *
   * (function() { return _.isArguments(arguments); })(1, 2, 3);
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    return toString.call(value) == argsClass;
  }
  // fallback for browsers that can't detect `arguments` objects by [[Class]]
  if (!support.argsClass) {
    isArguments = function(value) {
      return value ? hasOwnProperty.call(value, 'callee') : false;
    };
  }

  /**
   * Checks if `value` is an array.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is an array, else `false`.
   * @example
   *
   * (function() { return _.isArray(arguments); })();
   * // => false
   *
   * _.isArray([1, 2, 3]);
   * // => true
   */
  var isArray = nativeIsArray || function(value) {
    // `instanceof` may cause a memory leak in IE 7 if `value` is a host object
    // http://ajaxian.com/archives/working-aroung-the-instanceof-memory-leak
    return (support.argsObject && value instanceof Array) || toString.call(value) == arrayClass;
  };

  /**
   * A fallback implementation of `Object.keys` that produces an array of the
   * given object's own enumerable property names.
   *
   * @private
   * @type Function
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   */
  var shimKeys = createIterator({
    'args': 'object',
    'init': '[]',
    'top': 'if (!(objectTypes[typeof object])) return result',
    'loop': 'result.push(index)',
    'arrays': false
  });

  /**
   * Creates an array composed of the own enumerable property names of `object`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   * @example
   *
   * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
   * // => ['one', 'two', 'three'] (order is not guaranteed)
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    if (!isObject(object)) {
      return [];
    }
    if ((support.enumPrototypes && typeof object == 'function') ||
        (support.nonEnumArgs && object.length && isArguments(object))) {
      return shimKeys(object);
    }
    return nativeKeys(object);
  };

  /**
   * A function compiled to iterate `arguments` objects, arrays, objects, and
   * strings consistenly across environments, executing the `callback` for each
   * element in the `collection`. The `callback` is bound to `thisArg` and invoked
   * with three arguments; (value, index|key, collection). Callbacks may exit
   * iteration early by explicitly returning `false`.
   *
   * @private
   * @type Function
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array|Object|String} Returns `collection`.
   */
  var each = createIterator(eachIteratorOptions);

  /**
   * Used to convert characters to HTML entities:
   *
   * Though the `>` character is escaped for symmetry, characters like `>` and `/`
   * don't require escaping in HTML and have no special meaning unless they're part
   * of a tag or an unquoted attribute value.
   * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
   */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  /** Used to convert HTML entities to characters */
  var htmlUnescapes = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#x27;':"'"};

  /*--------------------------------------------------------------------------*/

  /**
   * Assigns own enumerable properties of source object(s) to the destination
   * object. Subsequent sources will overwrite property assignments of previous
   * sources. If a `callback` function is passed, it will be executed to produce
   * the assigned values. The `callback` is bound to `thisArg` and invoked with
   * two arguments; (objectValue, sourceValue).
   *
   * @static
   * @memberOf _
   * @type Function
   * @alias extend
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @param {Function} [callback] The function to customize assigning values.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * _.assign({ 'name': 'moe' }, { 'age': 40 });
   * // => { 'name': 'moe', 'age': 40 }
   *
   * var defaults = _.partialRight(_.assign, function(a, b) {
   *   return typeof a == 'undefined' ? b : a;
   * });
   *
   * var food = { 'name': 'apple' };
   * defaults(food, { 'name': 'banana', 'type': 'fruit' });
   * // => { 'name': 'apple', 'type': 'fruit' }
   */
  var assign = createIterator(defaultsIteratorOptions, {
    'top':
      defaultsIteratorOptions.top.replace(';',
        ';\n' +
        "if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {\n" +
        '  var callback = lodash.createCallback(args[--argsLength - 1], args[argsLength--], 2);\n' +
        "} else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {\n" +
        '  callback = args[--argsLength];\n' +
        '}'
      ),
    'loop': 'result[index] = callback ? callback(result[index], iterable[index]) : iterable[index]'
  });

  /**
   * Creates a clone of `value`. If `deep` is `true`, nested objects will also
   * be cloned, otherwise they will be assigned by reference. If a `callback`
   * function is passed, it will be executed to produce the cloned values. If
   * `callback` returns `undefined`, cloning will be handled by the method instead.
   * The `callback` is bound to `thisArg` and invoked with one argument; (value).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to clone.
   * @param {Boolean} [deep=false] A flag to indicate a deep clone.
   * @param {Function} [callback] The function to customize cloning values.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @param- {Array} [stackA=[]] Tracks traversed source objects.
   * @param- {Array} [stackB=[]] Associates clones with source counterparts.
   * @returns {Mixed} Returns the cloned `value`.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 }
   * ];
   *
   * var shallow = _.clone(stooges);
   * shallow[0] === stooges[0];
   * // => true
   *
   * var deep = _.clone(stooges, true);
   * deep[0] === stooges[0];
   * // => false
   *
   * _.mixin({
   *   'clone': _.partialRight(_.clone, function(value) {
   *     return _.isElement(value) ? value.cloneNode(false) : undefined;
   *   })
   * });
   *
   * var clone = _.clone(document.body);
   * clone.childNodes.length;
   * // => 0
   */
  function clone(value, deep, callback, thisArg, stackA, stackB) {
    var result = value;

    // allows working with "Collections" methods without using their `callback`
    // argument, `index|key`, for this method's `callback`
    if (typeof deep == 'function') {
      thisArg = callback;
      callback = deep;
      deep = false;
    }
    if (typeof callback == 'function') {
      callback = (typeof thisArg == 'undefined')
        ? callback
        : lodash.createCallback(callback, thisArg, 1);

      result = callback(result);
      if (typeof result != 'undefined') {
        return result;
      }
      result = value;
    }
    // inspect [[Class]]
    var isObj = isObject(result);
    if (isObj) {
      var className = toString.call(result);
      if (!cloneableClasses[className] || (!support.nodeClass && isNode(result))) {
        return result;
      }
      var isArr = isArray(result);
    }
    // shallow clone
    if (!isObj || !deep) {
      return isObj
        ? (isArr ? slice(result) : assign({}, result))
        : result;
    }
    var ctor = ctorByClass[className];
    switch (className) {
      case boolClass:
      case dateClass:
        return new ctor(+result);

      case numberClass:
      case stringClass:
        return new ctor(result);

      case regexpClass:
        return ctor(result.source, reFlags.exec(result));
    }
    // check for circular references and return corresponding clone
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == value) {
        return stackB[length];
      }
    }
    // init cloned object
    result = isArr ? ctor(result.length) : {};

    // add array properties assigned by `RegExp#exec`
    if (isArr) {
      if (hasOwnProperty.call(value, 'index')) {
        result.index = value.index;
      }
      if (hasOwnProperty.call(value, 'input')) {
        result.input = value.input;
      }
    }
    // add the source value to the stack of traversed objects
    // and associate it with its clone
    stackA.push(value);
    stackB.push(result);

    // recursively populate clone (susceptible to call stack limits)
    (isArr ? forEach : forOwn)(value, function(objValue, key) {
      result[key] = clone(objValue, deep, callback, undefined, stackA, stackB);
    });

    return result;
  }

  /**
   * Iterates over `object`'s own and inherited enumerable properties, executing
   * the `callback` for each property. The `callback` is bound to `thisArg` and
   * invoked with three arguments; (value, key, object). Callbacks may exit iteration
   * early by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @type Function
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * function Dog(name) {
   *   this.name = name;
   * }
   *
   * Dog.prototype.bark = function() {
   *   alert('Woof, woof!');
   * };
   *
   * _.forIn(new Dog('Dagny'), function(value, key) {
   *   alert(key);
   * });
   * // => alerts 'name' and 'bark' (order is not guaranteed)
   */
  var forIn = createIterator(eachIteratorOptions, forOwnIteratorOptions, {
    'useHas': false
  });

  /**
   * Iterates over an object's own enumerable properties, executing the `callback`
   * for each property. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, key, object). Callbacks may exit iteration early by explicitly
   * returning `false`.
   *
   * @static
   * @memberOf _
   * @type Function
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
   *   alert(key);
   * });
   * // => alerts '0', '1', and 'length' (order is not guaranteed)
   */
  var forOwn = createIterator(eachIteratorOptions, forOwnIteratorOptions);

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent to each other. If `callback` is passed, it will be executed to
   * compare values. If `callback` returns `undefined`, comparisons will be handled
   * by the method instead. The `callback` is bound to `thisArg` and invoked with
   * two arguments; (a, b).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} a The value to compare.
   * @param {Mixed} b The other value to compare.
   * @param {Function} [callback] The function to customize comparing values.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @param- {Array} [stackA=[]] Tracks traversed `a` objects.
   * @param- {Array} [stackB=[]] Tracks traversed `b` objects.
   * @returns {Boolean} Returns `true`, if the values are equivalent, else `false`.
   * @example
   *
   * var moe = { 'name': 'moe', 'age': 40 };
   * var copy = { 'name': 'moe', 'age': 40 };
   *
   * moe == copy;
   * // => false
   *
   * _.isEqual(moe, copy);
   * // => true
   *
   * var words = ['hello', 'goodbye'];
   * var otherWords = ['hi', 'goodbye'];
   *
   * _.isEqual(words, otherWords, function(a, b) {
   *   var reGreet = /^(?:hello|hi)$/i,
   *       aGreet = _.isString(a) && reGreet.test(a),
   *       bGreet = _.isString(b) && reGreet.test(b);
   *
   *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
   * });
   * // => true
   */
  function isEqual(a, b, callback, thisArg, stackA, stackB) {
    // used to indicate that when comparing objects, `a` has at least the properties of `b`
    var whereIndicator = callback === indicatorObject;
    if (callback && !whereIndicator) {
      callback = (typeof thisArg == 'undefined')
        ? callback
        : lodash.createCallback(callback, thisArg, 2);

      var result = callback(a, b);
      if (typeof result != 'undefined') {
        return !!result;
      }
    }
    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }
    var type = typeof a,
        otherType = typeof b;

    // exit early for unlike primitive values
    if (a === a &&
        (!a || (type != 'function' && type != 'object')) &&
        (!b || (otherType != 'function' && otherType != 'object'))) {
      return false;
    }
    // exit early for `null` and `undefined`, avoiding ES3's Function#call behavior
    // http://es5.github.com/#x15.3.4.4
    if (a == null || b == null) {
      return a === b;
    }
    // compare [[Class]] names
    var className = toString.call(a),
        otherClass = toString.call(b);

    if (className == argsClass) {
      className = objectClass;
    }
    if (otherClass == argsClass) {
      otherClass = objectClass;
    }
    if (className != otherClass) {
      return false;
    }
    switch (className) {
      case boolClass:
      case dateClass:
        // coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0`, treating invalid dates coerced to `NaN` as not equal
        return +a == +b;

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return (a != +a)
          ? b != +b
          // but treat `+0` vs. `-0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case regexpClass:
      case stringClass:
        // coerce regexes to strings (http://es5.github.com/#x15.10.6.4)
        // treat string primitives and their corresponding object instances as equal
        return a == String(b);
    }
    var isArr = className == arrayClass;
    if (!isArr) {
      // unwrap any `lodash` wrapped values
      if (hasOwnProperty.call(a, '__wrapped__ ') || hasOwnProperty.call(b, '__wrapped__')) {
        return isEqual(a.__wrapped__ || a, b.__wrapped__ || b, callback, thisArg, stackA, stackB);
      }
      // exit for functions and DOM nodes
      if (className != objectClass || (!support.nodeClass && (isNode(a) || isNode(b)))) {
        return false;
      }
      // in older versions of Opera, `arguments` objects have `Array` constructors
      var ctorA = !support.argsObject && isArguments(a) ? Object : a.constructor,
          ctorB = !support.argsObject && isArguments(b) ? Object : b.constructor;

      // non `Object` object instances with different constructors are not equal
      if (ctorA != ctorB && !(
            isFunction(ctorA) && ctorA instanceof ctorA &&
            isFunction(ctorB) && ctorB instanceof ctorB
          )) {
        return false;
      }
    }
    // assume cyclic structures are equal
    // the algorithm for detecting cyclic structures is adapted from ES 5.1
    // section 15.12.3, abstract operation `JO` (http://es5.github.com/#x15.12.3)
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == a) {
        return stackB[length] == b;
      }
    }
    var size = 0;
    result = true;

    // add `a` and `b` to the stack of traversed objects
    stackA.push(a);
    stackB.push(b);

    // recursively compare objects and arrays (susceptible to call stack limits)
    if (isArr) {
      length = a.length;
      size = b.length;

      // compare lengths to determine if a deep comparison is necessary
      result = size == a.length;
      if (!result && !whereIndicator) {
        return result;
      }
      // deep compare the contents, ignoring non-numeric properties
      while (size--) {
        var index = length,
            value = b[size];

        if (whereIndicator) {
          while (index--) {
            if ((result = isEqual(a[index], value, callback, thisArg, stackA, stackB))) {
              break;
            }
          }
        } else if (!(result = isEqual(a[size], value, callback, thisArg, stackA, stackB))) {
          break;
        }
      }
      return result;
    }
    // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
    // which, in this case, is more costly
    forIn(b, function(value, key, b) {
      if (hasOwnProperty.call(b, key)) {
        // count the number of properties.
        size++;
        // deep compare each property value.
        return (result = hasOwnProperty.call(a, key) && isEqual(a[key], value, callback, thisArg, stackA, stackB));
      }
    });

    if (result && !whereIndicator) {
      // ensure both objects have the same number of properties
      forIn(a, function(value, key, a) {
        if (hasOwnProperty.call(a, key)) {
          // `size` will be `-1` if `a` has more properties than `b`
          return (result = --size > -1);
        }
      });
    }
    return result;
  }

  /**
   * Checks if `value` is a function.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   */
  function isFunction(value) {
    return typeof value == 'function';
  }
  // fallback for older versions of Chrome and Safari
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return value instanceof Function || toString.call(value) == funcClass;
    };
  }

  /**
   * Checks if `value` is the language type of Object.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.com/#x8
    // and avoid a V8 bug
    // http://code.google.com/p/v8/issues/detail?id=2291
    return value ? objectTypes[typeof value] : false;
  }

  /**
   * Checks if `value` is a string.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true`, if the `value` is a string, else `false`.
   * @example
   *
   * _.isString('moe');
   * // => true
   */
  function isString(value) {
    return typeof value == 'string' || toString.call(value) == stringClass;
  }

  /**
   * Creates a shallow clone of `object` composed of the specified properties.
   * Property names may be specified as individual arguments or as arrays of property
   * names. If `callback` is passed, it will be executed for each property in the
   * `object`, picking the properties `callback` returns truthy for. The `callback`
   * is bound to `thisArg` and invoked with three arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The source object.
   * @param {Array|Function|String} callback|[prop1, prop2, ...] The function called
   *  per iteration or properties to pick, either as individual arguments or arrays.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns an object composed of the picked properties.
   * @example
   *
   * _.pick({ 'name': 'moe', '_userid': 'moe1' }, 'name');
   * // => { 'name': 'moe' }
   *
   * _.pick({ 'name': 'moe', '_userid': 'moe1' }, function(value, key) {
   *   return key.charAt(0) != '_';
   * });
   * // => { 'name': 'moe' }
   */
  function pick(object, callback, thisArg) {
    var result = {};
    if (typeof callback != 'function') {
      var index = 0,
          props = concat.apply(arrayRef, arguments),
          length = isObject(object) ? props.length : 0;

      while (++index < length) {
        var key = props[index];
        if (key in object) {
          result[key] = object[key];
        }
      }
    } else {
      callback = lodash.createCallback(callback, thisArg);
      forIn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result[key] = value;
        }
      });
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Examines each element in a `collection`, returning the first that the `callback`
   * returns truthy for. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, index|key, collection).
   *
   * If a property name is passed for `callback`, the created "_.pluck" style
   * callback will return the property value of the given element.
   *
   * If an object is passed for `callback`, the created "_.where" style callback
   * will return `true` for elements that have the properties of the given object,
   * else `false`.
   *
   * @static
   * @memberOf _
   * @alias detect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|Object|String} [callback=identity] The function called per
   *  iteration. If a property name or object is passed, it will be used to create
   *  a "_.pluck" or "_.where" style callback, respectively.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Mixed} Returns the found element, else `undefined`.
   * @example
   *
   * _.find([1, 2, 3, 4], function(num) { return num % 2 == 0; });
   * // => 2
   *
   * var food = [
   *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
   *   { 'name': 'banana', 'organic': true,  'type': 'fruit' },
   *   { 'name': 'beet',   'organic': false, 'type': 'vegetable' }
   * ];
   *
   * // using "_.where" callback shorthand
   * _.find(food, { 'type': 'vegetable' });
   * // => { 'name': 'beet', 'organic': false, 'type': 'vegetable' }
   *
   * // using "_.pluck" callback shorthand
   * _.find(food, 'organic');
   * // => { 'name': 'banana', 'organic': true, 'type': 'fruit' }
   */
  function find(collection, callback, thisArg) {
    callback = lodash.createCallback(callback, thisArg);

    if (isArray(collection)) {
      var index = -1,
          length = collection.length;

      while (++index < length) {
        var value = collection[index];
        if (callback(value, index, collection)) {
          return value;
        }
      }
    } else {
      var result;
      each(collection, function(value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }
  }

  /**
   * Iterates over a `collection`, executing the `callback` for each element in
   * the `collection`. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, index|key, collection). Callbacks may exit iteration early
   * by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array|Object|String} Returns `collection`.
   * @example
   *
   * _([1, 2, 3]).forEach(alert).join(',');
   * // => alerts each number and returns '1,2,3'
   *
   * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
   * // => alerts each number value (order is not guaranteed)
   */
  function forEach(collection, callback, thisArg) {
    if (callback && typeof thisArg == 'undefined' && isArray(collection)) {
      var index = -1,
          length = collection.length;

      while (++index < length) {
        if (callback(collection[index], index, collection) === false) {
          break;
        }
      }
    } else {
      each(collection, callback, thisArg);
    }
    return collection;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Gets the index at which the first occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`. If the `array` is already
   * sorted, passing `true` for `fromIndex` will run a faster binary search.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Boolean|Number} [fromIndex=0] The index to search from or `true` to
   *  perform a binary search on a sorted `array`.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 1
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 4
   *
   * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
   * // => 2
   */
  function indexOf(array, value, fromIndex) {
    var index = -1,
        length = array ? array.length : 0;

    if (typeof fromIndex == 'number') {
      index = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0) - 1;
    } else if (fromIndex) {
      index = sortedIndex(array, value);
      return array[index] === value ? index : -1;
    }
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Uses a binary search to determine the smallest index at which the `value`
   * should be inserted into `array` in order to maintain the sort order of the
   * sorted `array`. If `callback` is passed, it will be executed for `value` and
   * each element in `array` to compute their sort ranking. The `callback` is
   * bound to `thisArg` and invoked with one argument; (value).
   *
   * If a property name is passed for `callback`, the created "_.pluck" style
   * callback will return the property value of the given element.
   *
   * If an object is passed for `callback`, the created "_.where" style callback
   * will return `true` for elements that have the properties of the given object,
   * else `false`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Mixed} value The value to evaluate.
   * @param {Function|Object|String} [callback=identity] The function called per
   *  iteration. If a property name or object is passed, it will be used to create
   *  a "_.pluck" or "_.where" style callback, respectively.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Number} Returns the index at which the value should be inserted
   *  into `array`.
   * @example
   *
   * _.sortedIndex([20, 30, 50], 40);
   * // => 2
   *
   * // using "_.pluck" callback shorthand
   * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
   * // => 2
   *
   * var dict = {
   *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
   * };
   *
   * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
   *   return dict.wordToNumber[word];
   * });
   * // => 2
   *
   * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
   *   return this.wordToNumber[word];
   * }, dict);
   * // => 2
   */
  function sortedIndex(array, value, callback, thisArg) {
    var low = 0,
        high = array ? array.length : low;

    // explicitly reference `identity` for better inlining in Firefox
    callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
    value = callback(value);

    while (low < high) {
      var mid = (low + high) >>> 1;
      (callback(array[mid]) < value)
        ? low = mid + 1
        : high = mid;
    }
    return low;
  }

  /**
   * Creates an array with all occurrences of the passed values removed using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to filter.
   * @param {Mixed} [value1, value2, ...] Values to remove.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
   * // => [2, 3, 4]
   */
  function without(array) {
    var index = -1,
        length = array ? array.length : 0,
        contains = cachedContains(arguments, 1, 30),
        result = [];

    while (++index < length) {
      var value = array[index];
      if (!contains(value)) {
        result.push(value);
      }
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Produces a callback bound to an optional `thisArg`. If `func` is a property
   * name, the created callback will return the property value for a given element.
   * If `func` is an object, the created callback will return `true` for elements
   * that contain the equivalent object properties, otherwise it will return `false`.
   *
   * Note: All Lo-Dash methods, that accept a `callback` argument, use `_.createCallback`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Mixed} [func=identity] The value to convert to a callback.
   * @param {Mixed} [thisArg] The `this` binding of the created callback.
   * @param {Number} [argCount=3] The number of arguments the callback accepts.
   * @returns {Function} Returns a callback function.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 }
   * ];
   *
   * // wrap to create custom callback shorthands
   * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
   *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
   *   return !match ? func(callback, thisArg) : function(object) {
   *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
   *   };
   * });
   *
   * _.filter(stooges, 'age__gt45');
   * // => [{ 'name': 'larry', 'age': 50 }]
   *
   * // create mixins with support for "_.pluck" and "_.where" callback shorthands
   * _.mixin({
   *   'toLookup': function(collection, callback, thisArg) {
   *     callback = _.createCallback(callback, thisArg);
   *     return _.reduce(collection, function(result, value, index, collection) {
   *       return (result[callback(value, index, collection)] = value, result);
   *     }, {});
   *   }
   * });
   *
   * _.toLookup(stooges, 'name');
   * // => { 'moe': { 'name': 'moe', 'age': 40 }, 'larry': { 'name': 'larry', 'age': 50 } }
   */
  function createCallback(func, thisArg, argCount) {
    if (func == null) {
      return identity;
    }
    var type = typeof func;
    if (type != 'function') {
      if (type != 'object') {
        return function(object) {
          return object[func];
        };
      }
      var props = keys(func);
      return function(object) {
        var length = props.length,
            result = false;
        while (length--) {
          if (!(result = isEqual(object[props[length]], func[props[length]], indicatorObject))) {
            break;
          }
        }
        return result;
      };
    }
    if (typeof thisArg != 'undefined') {
      if (argCount === 1) {
        return function(value) {
          return func.call(thisArg, value);
        };
      }
      if (argCount === 2) {
        return function(a, b) {
          return func.call(thisArg, a, b);
        };
      }
      if (argCount === 4) {
        return function(accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return function(value, index, collection) {
        return func.call(thisArg, value, index, collection);
      };
    }
    return func;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * This function returns the first argument passed to it.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Mixed} value Any value.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * var moe = { 'name': 'moe' };
   * moe === _.identity(moe);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /*--------------------------------------------------------------------------*/

  lodash.assign = assign;
  lodash.createCallback = createCallback;
  lodash.forEach = forEach;
  lodash.forIn = forIn;
  lodash.forOwn = forOwn;
  lodash.keys = keys;
  lodash.pick = pick;
  lodash.without = without;

  lodash.each = forEach;
  lodash.extend = assign;

  /*--------------------------------------------------------------------------*/

  // add functions that return unwrapped values when chaining
  lodash.clone = clone;
  lodash.find = find;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isEqual = isEqual;
  lodash.isFunction = isFunction;
  lodash.isObject = isObject;
  lodash.isString = isString;
  lodash.sortedIndex = sortedIndex;

  lodash.detect = find;

  /*--------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type String
   */
  lodash.VERSION = '1.1.0';

  /*--------------------------------------------------------------------------*/

  module.exports = lodash;

}(this));

});
require.register("particle/dist/collector.js", function(exports, require, module){
(function() {
  var Client, Collector, EventEmitter, applyOp, find, normalizePayload, objInclude, _, _ref,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __slice = Array.prototype.slice;

  if (typeof window !== "undefined" && window !== null) {
    EventEmitter = require('emitter');
  } else {
    EventEmitter = require('events').EventEmitter;
  }

  _ref = require('./util'), objInclude = _ref.objInclude, find = _ref.find;

  normalizePayload = require('./normalizePayload');

  Client = require('./client');

  applyOp = require('./applyOp');

  _ = require('lodash');

  Collector = (function(_super) {

    __extends(Collector, _super);

    function Collector(options) {
      var status,
        _this = this;
      status = 'waiting';
      this.data = {};
      this.identity = options.identity || {};
      this.network = options.network || {};
      this.debug = options.onDebug || function() {};
      this.error = options.onError || console.error;
      this.onRegister = options.onRegister || function(identity, receiver, err) {
        _this.client = Client(_this.network);
        return _this.client.register(identity, receiver, err);
      };
      this.on('ready', function() {
        _this.debug('ready!');
        return _this.status = 'ready';
      });
      this.on('data', function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        this.debug('Sending new data notification!');
        if (options.onData) return options.onData.apply(options, args);
      });
    }

    Collector.prototype.register = function(done) {
      var _this = this;
      done || (done = function() {});
      return this.onRegister(this.identity, this.receive.bind(this), function(err) {
        done(err);
        if (err) {
          return _this.error({
            context: 'Error: Stream - Could not initiate data transfer.',
            error: err
          });
        } else {
          return _this.debug('Registered with Stream.');
        }
      });
    };

    Collector.prototype.receive = function(name, event) {
      var nm,
        _this = this;
      this.lastUpdated = new Date(event.timestamp);
      this.debug('Received data.', {
        name: name,
        event: event
      });
      switch (name) {
        case 'manifest':
          this.manifest = event;
          return this.checkReady();
        case 'payload':
          this.data[event.root] = _.clone(event.data, true);
          nm = normalizePayload(event);
          if (nm.oplist.length > 0) this.emit('data', this.data, nm);
          return this.checkReady();
        case 'delta':
          return this.ready(function() {
            _this.debug("Updating collection '" + event.root + "' with '" + (event.oplist.map(function(o) {
              return o.operation;
            }).join(',')) + "'.");
            applyOp(_this.data, event);
            return _this.emit('data', _this.data, event);
          });
      }
    };

    Collector.prototype.checkReady = function() {
      var checkManifest, ready;
      checkManifest = function(data, manifest) {
        var name;
        if (manifest == null) return false;
        for (name in manifest) {
          if (name !== 'timestamp') if (!data[name]) return false;
        }
        return true;
      };
      ready = checkManifest(this.data, this.manifest);
      this.debug("Checking if we're ready...", {
        manifest: this.manifest != null,
        allReceived: ready
      });
      if (ready) return this.emit('ready');
    };

    Collector.prototype.ready = function(done) {
      if (this.status === 'ready') {
        return done();
      } else {
        return this.once('ready', done);
      }
    };

    Collector.prototype.reset = function(done) {
      var name;
      for (name in this.data) {
        delete this.data[name];
      }
      this.status = 'loading';
      return this.ready(done);
    };

    return Collector;

  })(EventEmitter);

  module.exports = Collector;

}).call(this);

});
require.register("particle/dist/client.js", function(exports, require, module){
(function() {
  var Client, client, createClientWrapper, queued;

  createClientWrapper = require('protosock').createClientWrapper;

  queued = [];

  client = {
    start: function() {
      return this.status = 'waiting';
    },
    connect: function(socket) {
      var q, _i, _len;
      this.status = 'ready';
      for (_i = 0, _len = queued.length; _i < _len; _i++) {
        q = queued[_i];
        q();
      }
      return queued = [];
    },
    options: {
      namespace: 'particle',
      resource: 'default',
      debug: false
    },
    message: function(socket, msg) {
      switch (msg.type) {
        case 'registered':
          return this.onRegistered(msg.err);
        case 'data':
          return this.receive(msg.name, msg.event);
      }
    },
    error: function(socket, err) {
      return console.log('client err:', {
        err: err
      });
    },
    ready: function(done) {
      if (this.status === 'ready') {
        return done();
      } else {
        return queued.push(done);
      }
    },
    register: function(identity, receive, finish) {
      var _this = this;
      return this.ready(function() {
        _this.ssocket.write({
          type: 'register',
          identity: identity
        });
        _this.onRegistered = finish;
        return _this.receive = receive;
      });
    }
  };

  module.exports = Client = createClientWrapper(client);

}).call(this);

});
require.register("particle/dist/applyOp.js", function(exports, require, module){
(function() {
  var indexContaining, removers, _,
    _this = this,
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = Array.prototype.slice;

  _ = require('lodash');

  removers = ['unset'];

  indexContaining = require('./util').indexContaining;

  module.exports = function(dataRoot, _arg) {
    var arrayIndex, arraySpec, data, id, index, location, node, op, operation, oplist, part, path, root, spec, subDoc, target, _i, _j, _k, _len, _len2, _ref;
    root = _arg.root, oplist = _arg.oplist;
    dataRoot[root] || (dataRoot[root] = []);
    for (_i = 0, _len = oplist.length; _i < _len; _i++) {
      op = oplist[_i];
      path = op.path, id = op.id, data = op.data, operation = op.operation;
      node = _.find(dataRoot[root], function(n) {
        return n.id === id;
      });
      if (!node) {
        if (__indexOf.call(removers, operation) >= 0) {
          return;
        } else {
          node = {
            id: id
          };
          dataRoot[root].push(node);
        }
      }
      if (path === '.') {
        target = dataRoot[root].indexOf(node);
        node = dataRoot[root];
        data = _.extend(data, {
          id: id
        });
      } else {
        _ref = path.split('.'), location = 2 <= _ref.length ? __slice.call(_ref, 0, _j = _ref.length - 1) : (_j = 0, []), target = _ref[_j++];
        for (_k = 0, _len2 = location.length; _k < _len2; _k++) {
          part = location[_k];
          arraySpec = part.match(/\[([0-9+])\]/);
          if (arraySpec) {
            spec = arraySpec[0], arrayIndex = arraySpec[1];
            arrayIndex = parseInt(arrayIndex);
            part = part.replace(spec, '');
          }
          if (node[part] == null) {
            if (__indexOf.call(removers, operation) >= 0) {
              return;
            } else {
              node[part] = arrayIndex ? [] : {};
            }
          }
          node = node[part];
          if (arrayIndex) {
            subDoc = _.find(node, function(item) {
              return item.id === arrayIndex;
            });
            if (subDoc == null) {
              if (__indexOf.call(removers, operation) >= 0) {
                return;
              } else {
                subDoc = {
                  id: arrayIndex
                };
                node.push(subDoc);
              }
            }
            node = subDoc;
          }
        }
      }
      switch (operation) {
        case 'set':
          node[target] = data;
          break;
        case 'unset':
          delete node[target];
          break;
        case 'inc':
          node[target] = (node[target] || 0) + (data || 1);
          break;
        case 'rename':
          node[data] = node[target];
          delete node[target];
          break;
        case 'push':
          node[target] || (node[target] = []);
          node[target].push(data);
          break;
        case 'pop':
          if (data === -1) {
            node[target].splice(0, 1);
          } else {
            node[target].splice(-1, 1);
          }
          break;
        case 'pull':
          index = indexContaining(node[target], data);
          if (index != null) node[target].splice(index, 1);
      }
    }
  };

}).call(this);

});
require.register("particle/dist/normalizePayload.js", function(exports, require, module){
(function() {

  module.exports = function(event) {
    var id, normalized, oplist, record, _i, _len, _ref;
    oplist = [];
    _ref = event.data;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      record = _ref[_i];
      id = record.id;
      delete record.id;
      oplist.push({
        operation: 'set',
        id: id,
        path: '.',
        data: record
      });
    }
    return normalized = {
      root: event.root,
      timestamp: event.timestamp,
      oplist: oplist
    };
  };

}).call(this);

});
require.register("particle/dist/util.js", function(exports, require, module){
(function() {
  var util, _;

  _ = require('lodash');

  module.exports = util = {
    getType: function(obj) {
      return Object.prototype.toString.call(obj).slice(8, -1);
    },
    objInclude: function(target, list) {
      var keys, name, _i, _len;
      if (util.getType(target) !== 'Object') return false;
      keys = (function() {
        switch (util.getType(list)) {
          case 'Array':
            return list;
          case 'String':
            return [list];
          case 'Object':
            return Object.keys(list);
          default:
            return null;
        }
      })();
      if (keys == null) return false;
      for (_i = 0, _len = keys.length; _i < _len; _i++) {
        name = keys[_i];
        if (!target[name]) return false;
      }
      return true;
    },
    empty: function(obj) {
      if (obj == null) return true;
      switch (util.getType(obj)) {
        case 'Object':
          return Object.keys(obj).length === 0;
        case 'Array':
        case 'String':
          return obj.length === 0;
        default:
          return false;
      }
    },
    contains: function(target, test) {
      return _.isEqual(target, test, function(left, right) {
        var newLeft;
        if (_.isPlainObject(left) && _.isPlainObject(right)) {
          newLeft = _.pick(left, _.keys(right));
          return _.isEqual(newLeft, right);
        }
      });
    },
    indexContaining: function(list, test) {
      var el, index, _len;
      for (index = 0, _len = list.length; index < _len; index++) {
        el = list[index];
        if (util.contains(el, test)) return index;
      }
      return null;
    }
  };

}).call(this);

});
require.alias("wearefractal-protosock/dist/main.js", "particle/deps/protosock/dist/main.js");
require.alias("wearefractal-protosock/dist/Socket.js", "particle/deps/protosock/dist/Socket.js");
require.alias("wearefractal-protosock/dist/util.js", "particle/deps/protosock/dist/util.js");
require.alias("wearefractal-protosock/dist/defaultClient.js", "particle/deps/protosock/dist/defaultClient.js");
require.alias("wearefractal-protosock/dist/Client.js", "particle/deps/protosock/dist/Client.js");
require.alias("wearefractal-protosock/dist/main.js", "particle/deps/protosock/index.js");
require.alias("component-emitter/index.js", "wearefractal-protosock/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("LearnBoost-engine.io-client/lib/index.js", "wearefractal-protosock/deps/engine.io/lib/index.js");
require.alias("LearnBoost-engine.io-client/lib/socket.js", "wearefractal-protosock/deps/engine.io/lib/socket.js");
require.alias("LearnBoost-engine.io-client/lib/transport.js", "wearefractal-protosock/deps/engine.io/lib/transport.js");
require.alias("LearnBoost-engine.io-client/lib/emitter.js", "wearefractal-protosock/deps/engine.io/lib/emitter.js");
require.alias("LearnBoost-engine.io-client/lib/util.js", "wearefractal-protosock/deps/engine.io/lib/util.js");
require.alias("LearnBoost-engine.io-client/lib/transports/index.js", "wearefractal-protosock/deps/engine.io/lib/transports/index.js");
require.alias("LearnBoost-engine.io-client/lib/transports/polling.js", "wearefractal-protosock/deps/engine.io/lib/transports/polling.js");
require.alias("LearnBoost-engine.io-client/lib/transports/polling-xhr.js", "wearefractal-protosock/deps/engine.io/lib/transports/polling-xhr.js");
require.alias("LearnBoost-engine.io-client/lib/transports/polling-jsonp.js", "wearefractal-protosock/deps/engine.io/lib/transports/polling-jsonp.js");
require.alias("LearnBoost-engine.io-client/lib/transports/websocket.js", "wearefractal-protosock/deps/engine.io/lib/transports/websocket.js");
require.alias("LearnBoost-engine.io-client/lib/transports/flashsocket.js", "wearefractal-protosock/deps/engine.io/lib/transports/flashsocket.js");
require.alias("LearnBoost-engine.io-client/lib/index.js", "wearefractal-protosock/deps/engine.io/index.js");
require.alias("component-emitter/index.js", "LearnBoost-engine.io-client/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("LearnBoost-engine.io-protocol/lib/index.js", "LearnBoost-engine.io-client/deps/engine.io-parser/lib/index.js");
require.alias("LearnBoost-engine.io-protocol/lib/keys.js", "LearnBoost-engine.io-client/deps/engine.io-parser/lib/keys.js");
require.alias("LearnBoost-engine.io-protocol/lib/index.js", "LearnBoost-engine.io-client/deps/engine.io-parser/index.js");
require.alias("LearnBoost-engine.io-protocol/lib/index.js", "LearnBoost-engine.io-protocol/index.js");

require.alias("visionmedia-debug/index.js", "LearnBoost-engine.io-client/deps/debug/index.js");
require.alias("visionmedia-debug/debug.js", "LearnBoost-engine.io-client/deps/debug/debug.js");

require.alias("LearnBoost-engine.io-client/lib/index.js", "LearnBoost-engine.io-client/index.js");

require.alias("wearefractal-protosock/dist/main.js", "wearefractal-protosock/index.js");

require.alias("component-emitter/index.js", "particle/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");
require.alias("particle/dist/lodash.js", "particle/deps/lodash/index.js");

require.alias("particle/dist/main.js", "particle/index.js");

if (typeof exports == "object") {
  module.exports = require("particle");
} else if (typeof define == "function" && define.amd) {
  define(require("particle"));
} else {
  window["Particle"] = require("particle");
}})();