logger = require 'ale'
_ = require 'lodash'

{getType, addTo, box} = require '../util'
convertToValue = require './convertToValue'

# combine a set of results using a given operator
# optional reverse operator for negated sets
#combine = (results, op, op2) ->
  #op2 ?= op
  #_.reduce results, (l, r) ->
    #result = {}
    #result.in = op l.in, r.in if l.in or r.in
    #result.nin = op2 l.nin, r.nin if l.nin or r.nin
    #return result

combine = (results, op) ->
  # only pass first two arguments, otherwise lodash tries to interpret
  # index as a set
  _.reduce results, (l, r) ->
    op l, r

module.exports = (cache, identity, collection, query) ->
  convert = convertToValue.bind(null, cache, identity)
  return [] unless getType(query) is 'Object'


  walk = (op, terms) ->

    idSet = null
    opKey = "#{collection}.#{op}"
    idKey = "#{collection}._id"

    if op.match /^\$/

      sub = for k, v of terms
        #logger.blue 'digging:', {k, v}
        walk k, v

      switch op
        when '$and'
          idSet = combine sub, _.intersection

        when '$or'
          idSet = combine sub, _.union

      #logger.cyan {op, combined: idSet}

    else

      if op is '_id'
        idSet = box convert terms

      # if we have a comparison operator:
      # http://docs.mongodb.org/manual/reference/operator/#comparison
      else if getType(terms) is 'Object'

        sub = for k, v of terms
          if k.match /^\$/
            comparitor = k.substring 1

            # cache supports all comparison operators listed at url above
            results = cache.find opKey, comparitor, convert(v)
            results[idKey] or []

          else
            # maybe we're comparing a real object value?
            undefined

        sub = _.compact sub # discard those undefined's!
        idSet = combine sub, _.intersection

      # otherwise it's a regular equality query
      else
        value = convert(terms)
        idSet = cache.get(opKey, value, idKey) or []

      #logger.magenta {original: idSet}

    return idSet

  # default behavior for the root is an '$and' so evaluate this explicitly
  result = walk '$and', query
  #logger.magenta {result}

  return result
