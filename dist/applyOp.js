// Generated by CoffeeScript 1.6.3
(function() {
  var getType, indexContaining, removers, _, _ref,
    _this = this,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  removers = require('./enums').removers;

  _ref = require('./util'), indexContaining = _ref.indexContaining, _ = _ref._, getType = _ref.getType;

  module.exports = function(dataRoot, _arg) {
    var arrayIndex, arraySpec, data, index, location, node, operation, part, path, root, spec, subDoc, target, _i, _id, _j, _len, _ref1, _ref2;
    root = _arg.root, path = _arg.path, _id = _arg._id, data = _arg.data, operation = _arg.operation;
    dataRoot[root] || (dataRoot[root] = []);
    if (operation === 'noop') {
      return;
    }
    node = _.find(dataRoot[root], function(n) {
      return n._id === _id;
    });
    if (!node) {
      if (__indexOf.call(removers, operation) >= 0) {
        return;
      } else {
        node = {
          _id: _id
        };
        dataRoot[root].push(node);
      }
    }
    if (path === '.') {
      target = dataRoot[root].indexOf(node);
      node = dataRoot[root];
      data = _.extend(data, {
        _id: _id
      });
    } else {
      _ref1 = path.split('.'), location = 2 <= _ref1.length ? __slice.call(_ref1, 0, _i = _ref1.length - 1) : (_i = 0, []), target = _ref1[_i++];
      for (_j = 0, _len = location.length; _j < _len; _j++) {
        part = location[_j];
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
            return item._id === arrayIndex;
          });
          if (subDoc == null) {
            if (__indexOf.call(removers, operation) >= 0) {
              return;
            } else {
              subDoc = {
                _id: arrayIndex
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
        return node[target] = data;
      case 'unset':
        if (getType(node) === 'Array' && getType(target) === 'Number') {
          return node.splice(target, 1);
        } else {
          return delete node[target];
        }
        break;
      case 'inc':
        return node[target] = (node[target] || 0) + (data || 1);
      case 'rename':
        node[data] = node[target];
        return delete node[target];
      case 'push':
        node[target] || (node[target] = []);
        return node[target].push(data);
      case 'pushAll':
        node[target] || (node[target] = []);
        return (_ref2 = node[target]).push.apply(_ref2, data);
      case 'pop':
        if (data === -1) {
          return node[target].splice(0, 1);
        } else {
          return node[target].splice(-1, 1);
        }
        break;
      case 'pull':
        index = indexContaining(node[target], data);
        if (index != null) {
          return node[target].splice(index, 1);
        }
    }
  };

}).call(this);
