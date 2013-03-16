{inspect} = require 'util'
should = require 'should'
applyOp = require '../lib/applyOp'
_ = require 'lodash'

tests = [
    description: 'set should create a new record in an existing collection'
    pre: {users: []}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'set'
        id: 5
        path: '.'
        data: {name: 'Bob'}
      ]
    post: {users: [{id: 5, name: 'Bob'}]}
  ,
    description: 'set should create a new collection and a new record'
    pre: {}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'set'
        id: 5
        path: '.'
        data: {name: 'Bob'}
      ]
    post: {users: [{id: 5, name: 'Bob'}]}
  ,
    description: 'set should not interfere with existing records'
    pre: {users: [{id: 6}, {id: 'nine', face: 'nameless'}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'set'
        id: 5
        path: '.'
        data: {name: 'Bob'}
      ]
    post: {users: [{id: 6}, {id: 'nine', face: 'nameless'}, {id: 5, name: 'Bob'}]}
  ,
    description: 'unset should remove a field'
    pre: {users: [{id: 5, name: 'Bob'}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'unset'
        id: 5
        path: 'name'
      ]
    post: {users: [{id: 5}]}
  ,
    description: 'unset should remove a record'
    pre: {users: [{id: 5, name: 'Bob'}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'unset'
        id: 5
        path: '.'
      ]
    post: {users: []}
  ,
    description: 'unset should not create new records'
    pre: {users: []}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'unset'
        id: 5
        path: 'name'
      ]
    post: {users: []}
  ,
    description: 'unset should not create new fields'
    pre: {users: [{id: 5}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'unset'
        id: 5
        path: 'friends.bob'
      ]
    post: {users: [{id: 5}]}
  ,
    description: 'inc should increment a value'
    pre: {users: [{id: 5, friends: 1}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'inc'
        id: 5
        path: 'friends'
      ]
    post: {users: [{id: 5, friends: 2}]}
  ,
    description: 'inc should increment a value by 4'
    pre: {users: [{id: 5, friends: 1}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'inc'
        id: 5
        path: 'friends'
        data: 4
      ]
    post: {users: [{id: 5, friends: 5}]}
  ,
    description: 'inc should create a new value'
    pre: {users: [{id: 5}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'inc'
        id: 5
        path: 'friends'
      ]
    post: {users: [{id: 5, friends: 1}]}
  ,
    description: 'inc should decrement a value'
    pre: {users: [{id: 5, friends: 0}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'inc'
        id: 5
        path: 'friends'
        data: -1
      ]
    post: {users: [{id: 5, friends: -1}]}
  ,
    description: 'rename should rename a field'
    pre: {users: [{id: 5, friends: 0}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'rename'
        id: 5
        path: 'friends'
        data: 'enemies'
      ]
    post: {users: [{id: 5, enemies: 0}]}
  ,
    description: 'rename a non-existent field should work'
    pre: {users: [{id: 5}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'rename'
        id: 5
        path: 'friends'
        data: 'enemies'
      ]
    post: {users: [{id: 5, enemies: undefined}]}
  ,
    description: 'rename should overwrite an existing field'
    pre: {users: [{id: 5, friends: 4, enemies: 8}]}
    op:
      root: 'users'
      timestamp: new Date
      oplist: [
        operation: 'rename'
        id: 5
        path: 'friends'
        data: 'enemies'
      ]
    post: {users: [{id: 5, enemies: 4}]}
]

describe 'applyOp', ->

  for test in tests
    do (test) ->
      {pre, op, post, description} = test
      it description, ->
        applyOp pre, op
        pre.should.eql post