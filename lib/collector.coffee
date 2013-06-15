{objInclude, find, _, EventEmitter} = require './util'
normalizePayload = require './normalizePayload'
Client = require './client'
applyOp = require './applyOp'

class Collector extends EventEmitter

  # connect to server
  # {sessionId?}, {register, onDebug, onError}
  constructor: (options={}) ->
    status = 'waiting'
    @data = {}
    @identity = options.identity or {}
    @network = options.network or {}
    @debug = options.onDebug or ->
    @onData = options.onData or ->
    @error = options.onError or console.error

    super {
      wildcard: true
      maxListeners: Infinity
    }

    # on register, call user provided register, or connect via websockets
    @onRegister = options.onRegister or (identity, receiver, err) =>
      @client = Client @network
      @client.register identity, receiver, err

    @on 'ready', =>
      @debug 'ready!'
      @status = 'ready'

    @on 'data', (data, event) ->
      @debug 'Sending new data notification!'

      # normalize events and emit specific path changes
      if event.oplist
        for op in event.oplist
          eventName = "#{event.root}.#{op.path}"
          normEvent = _.merge({}, event, op)
          delete normEvent.oplist
          @emit eventName, data, normEvent

      # respond to constructor based listener
      @onData data, event

  register: (done) ->
    done or= ->
    @onRegister @identity, @receive.bind(@), (err) =>
      done err
      if err
        @error {context: 'Stream: Registration failed.', error: err}
      else
        @debug 'Registered with Stream.'

  receive: (name, event) ->
    @lastUpdated = new Date event.timestamp
    @debug 'Received data.', {name, event}

    switch name

      when 'manifest'
        @manifest = event
        @checkReady()

      when 'payload'
        @data[event.root] = _.clone event.data, true

        # format the data to look like a normal update
        # only tell listeners about it if we actually got data
        nm = normalizePayload event
        if nm.oplist.length > 0
          @emit 'data', @data, nm

        @checkReady()

      when 'delta'
        @ready =>
          @debug "Updating collection '#{event.root}' with '#{event.oplist.map((o)->o.operation).join ','}'."
          applyOp @data, event
          @emit 'data', @data, event

  checkReady: ->
    checkManifest = (data, manifest) ->
      return false unless manifest?
      for name of manifest when name isnt 'timestamp'
        return false unless data[name]
      return true

    ready = checkManifest @data, @manifest

    @debug "Checking if we're ready...", {manifest: @manifest?, allReceived: ready}
    @emit 'ready' if ready

  ready: (done) ->
    if @status is 'ready'
      done()
    else
      @once 'ready', done

  reset: (done) ->
    delete @data[name] for name of @data
    @status = 'loading'
    @ready done

module.exports = Collector
