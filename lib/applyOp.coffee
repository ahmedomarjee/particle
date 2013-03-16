_ = require 'lodash'
removers = ['unset']

module.exports = (dataRoot, {root, oplist}) =>

  # create the collection if it doesn't exist
  dataRoot[root] or= []

  for op in oplist

    # get required params
    {path, id, data, operation} = op

    # get or create document
    node = _.find dataRoot[root], (n) -> n.id is id
    unless node

      # create the doc unless it's a removal op
      if operation in removers
        return
      else
        node = {id: id}
        dataRoot[root].push node

    if path is '.'
      # rewind target/node so root can be set
      target = dataRoot[root].indexOf node
      node = dataRoot[root]
      data = _.extend data, {id: id}

    else
      # walk down through the target document
      [location..., target] = path.split '.'
      for part in location

        # be forgiving and create non-existent nodes unless it's a removal op
        unless node[part]?
          if operation in removers
            return
          else
            node[part] = {} # TODO: maybe do []/{} depending on manifest?

        node = node[part]

    # apply the appropriate change
    switch operation
      when 'set'
        node[target] = data
      when 'unset'
        delete node[target]
      when 'inc'
        node[target] = (node[target] or 0) + (data or 1)
      when 'rename'
        node[data] = node[target]
        delete node[target]