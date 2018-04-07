/* global Promise */

var http = require('http');
var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var nop = require('nop');
var getRandomPort = require('get-random-port');
var systemUnderTest = require('../../dist/adapter');
var SlackMessageAdapter = systemUnderTest.default;

// fixtures
var workingVerificationToken = 'VERIFICATION_TOKEN';

// helpers
/**
 * Encapsulates knowledge of adapter handler registration internals and asserts that a handler
 * was registered.
 *
 * @param {SlackMessageAdapter} adapter
 * @param {Function} handler
 * @param {Object} [constraints]
 */
function assertHandlerRegistered(adapter, handler, constraints) {
  var callbackEntry;

  assert.isNotEmpty(adapter.callbacks);
  callbackEntry = adapter.callbacks.find(function (aCallbackEntry) {
    return handler === aCallbackEntry[1];
  });
  assert.isOk(callbackEntry);
  if (constraints) {
    assert.deepEqual(callbackEntry[0], constraints);
  }
}

/**
 * Encapsulates knowledge of adapter handler registration internals and unregistered all handlers.
 * @param {SlackMessageAdapter} adapter
 */
function unregisterAllHandlers(adapter) {
  adapter.callbacks = []; // eslint-disable-line no-param-reassign
}

// shared tests
function shouldRegisterWithCallbackId(methodName) {
  describe('when registering with a callback_id', function () {
    beforeEach(function () {
      this.handler = function () { };
    });
    it('a plain string callback_id registers successfully', function () {
      this.adapter[methodName]('my_callback', this.handler);
      assertHandlerRegistered(this.adapter, this.handler);
    });
    it('a RegExp callback_id registers successfully', function () {
      this.adapter[methodName](/\w+_callback/, this.handler);
      assertHandlerRegistered(this.adapter, this.handler);
    });
    it('invalid callback_id types throw on registration', function () {
      var handler = this.handler;
      assert.throws(function () {
        this.adapter[methodName](5, handler);
      }, TypeError);
      assert.throws(function () {
        this.adapter[methodName](true, handler);
      }, TypeError);
      assert.throws(function () {
        this.adapter[methodName]([], handler);
      }, TypeError);
      assert.throws(function () {
        this.adapter[methodName](null, handler);
      }, TypeError);
      assert.throws(function () {
        this.adapter[methodName](undefined, handler);
      }, TypeError);
    });
  });
}

// test suite
describe('SlackMessageAdapter', function () {
  beforeEach(function () {
  });
  describe('constructor', function () {
    it('should build an instance', function () {
      var adapter = new SlackMessageAdapter(workingVerificationToken);
      assert.instanceOf(adapter, SlackMessageAdapter);
    });
    it('should fail without a verification token', function () {
      assert.throws(function () {
        var adapter = new SlackMessageAdapter();  // eslint-disable-line no-unused-vars
      }, TypeError);
    });
  });

  describe('#createServer()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
    });
    describe('when express package is not found', function () {
      beforeEach(function () {
        var SlackMessageAdapterNoExpress = proxyquire('../../dist/adapter', { express: null }).default;
        this.adapter = new SlackMessageAdapterNoExpress(workingVerificationToken);
      });
      it('should reject', function () {
        return this.adapter.createServer()
          .then(function (server) {
            assert.isNotOk(server, 'a server was created');
          })
          .catch(function (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
              assert(true);
            } else {
              throw error;
            }
          });
      });
    });

    describe('when body-parser package is not found', function () {
      beforeEach(function () {
        var SlackMessageAdapterNoBodyParser = proxyquire('../../dist/adapter', { 'body-parser': null }).default;
        this.adapter = new SlackMessageAdapterNoBodyParser(workingVerificationToken);
      });
      it('should reject', function () {
        return this.adapter.createServer()
          .then(function (server) {
            assert.isNotOk(server, 'a server was created');
          })
          .catch(function (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
              assert(true);
            } else {
              throw error;
            }
          });
      });
    });

    it('should return a Promise of an http.Server', function () {
      return this.adapter.createServer().then(function (server) {
        assert.instanceOf(server, http.Server);
      });
    });
  });

  describe('#start()', function () {
    beforeEach(function (done) {
      var self = this;
      self.adapter = new SlackMessageAdapter(workingVerificationToken);
      getRandomPort(function (error, port) {
        if (error) return done(error);
        self.portNumber = port;
        return done();
      });
    });
    afterEach(function () {
      return this.adapter.stop().catch(nop);
    });
    it('should return a Promise for a started http.Server', function () {
      var self = this;
      return this.adapter.start(self.portNumber).then(function (server) {
        // only works in node >= 5.7.0
        // assert(server.listening);
        assert.equal(server.address().port, self.portNumber);
      });
    });
  });

  describe('#stop()', function () {
    beforeEach(function (done) {
      var self = this;
      self.adapter = new SlackMessageAdapter(workingVerificationToken);
      getRandomPort(function (error, port) {
        if (error) return done(error);
        return self.adapter.start(port)
          .then(function (server) {
            self.server = server;
            done();
          })
          .catch(done);
      });
    });
    afterEach(function () {
      return this.adapter.stop().catch(nop);
    });
    it('should return a Promise and the server should be stopped', function () {
      var self = this;
      return this.adapter.stop().then(function () {
        assert(!self.server.listening);
      });
    });
  });

  describe('#expressMiddleware()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
    });
    it('should return a function', function () {
      var middleware = this.adapter.expressMiddleware();
      assert.isFunction(middleware);
    });
  });

  describe('#action()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
    });
    it('should fail action registration without handler', function () {
      assert.throws(function () {
        this.adapter.action('my_callback');
      }, TypeError);
    });

    // shared tests
    shouldRegisterWithCallbackId('action');

    describe('when registering with a complex set of constraints', function () {
      beforeEach(function () {
        this.actionHandler = function () { };
      });
      it('should register with valid type constraints successfully', function () {
        var adapter = this.adapter;
        var actionHandler = this.actionHandler;
        var constraintsSet = [
          { type: 'button' },
          { type: 'select' },
          { type: 'dialog_submission' }
        ];
        constraintsSet.forEach(function (constraints) {
          adapter.action(constraints, actionHandler);
          assertHandlerRegistered(adapter, actionHandler, constraints);
          unregisterAllHandlers(adapter);
        });
      });
      it('should throw when registering with invalid type constraints', function () {
        var actionHandler = this.actionHandler;
        var constraints = { type: 'not_a_real_action_type' };
        assert.throws(function () {
          this.adapter.action(constraints, actionHandler);
        }, TypeError);
      });
      it('should register with valid compound constraints successfully', function () {
        var constraints = { callbackId: 'my_callback', type: 'button' };
        this.adapter.action(constraints, this.actionHandler);
        assertHandlerRegistered(this.adapter, this.actionHandler, constraints);
      });
      it('should throw when registering with invalid compound constraints', function () {
        var actionHandler = this.actionHandler;
        var constraints = { callbackId: /\w+_callback/, type: 'not_a_real_action_type' };
        assert.throws(function () {
          this.adapter.action(constraints, actionHandler);
        }, TypeError);
      });
      it('should register with unfurl constraint successfully', function () {
        var constraints = { unfurl: true };
        this.adapter.action(constraints, this.actionHandler);
        assertHandlerRegistered(this.adapter, this.actionHandler, constraints);
      });
    });
  });

  describe('#options()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
    });
    it('should fail options registration without handler', function () {
      assert.throws(function () {
        this.adapter.options('my_callback');
      }, TypeError);
    });

    // shared tests
    shouldRegisterWithCallbackId('options');
  });

  describe('#dispatch()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
      this.synchronousTimeout = 2500;
    });
    // NOTE: the middleware has to check the verification token
    describe('when dispatching an message action request', function () {
      it('should handle the callback returning a message with a synchronous response', function () {
        var dispatchResponse;
        var requestPayload = {
          type: 'interactive_message',
          callback_id: 'id',
          text: 'example input message',
          response_url: 'https://example.com'
        };
        var replacement = { text: 'example replacement message' };
        this.adapter.action('id', function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return replacement;
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.resolve(dispatchResponse.content)
          .then(function (content) {
            assert.deepEqual(content, replacement);
          });
      });
      it('should handle the callback returning a promise of a message before the timeout with a ' +
         'synchronous response', function () {
        var dispatchResponse;
        var requestPayload = {
          type: 'interactive_message',
          callback_id: 'id',
          text: 'example input message',
          response_url: 'https://example.com'
        };
        var replacement = { text: 'example replacement message' };
        var timeout = this.synchronousTimeout;
        this.timeout(timeout);
        this.adapter.action('id', function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve(replacement);
            }, timeout / 2);
          });
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.resolve(dispatchResponse.content)
          .then(function (content) {
            assert.deepEqual(content, replacement);
          });
      });
      it('should handle the callback returning a promise of a message after the timeout with an ' +
         'asynchronous response', function () {
        // TODO: introduce nock to capture the request to the `response_url`
        var dispatchResponse;
        var requestPayload = {
          type: 'interactive_message',
          callback_id: 'id',
          text: 'example input message',
          response_url: 'https://example.com'
        };
        var replacement = { text: 'example replacement message' };
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action('id', function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return new Promise(function (resolve) {
            setTimeout(function () {
              resolve(replacement);
            }, timeout + 20);
          });
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.resolve(dispatchResponse.content)
          .then(function (content) {
            assert.deepEqual(content, '');
          });
      });
    });
  });
});
