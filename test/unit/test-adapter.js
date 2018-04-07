/* global Promise */

var http = require('http');
var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var sinon = require('sinon');
var nop = require('nop');
var getRandomPort = require('get-random-port');
var systemUnderTest = require('../../dist/adapter');
var SlackMessageAdapter = systemUnderTest.default;

// fixtures
var workingVerificationToken = 'VERIFICATION_TOKEN';

// helpers
/**
 * Returns a Promise that resolves or rejects in approximately the specified amount of time with
 * the specified value or error reason.
 * @param {number} ms time in milliseconds in which to resolve or reject
 * @param {*} value value used for resolve
 * @param {string} [rejectionReason] reason used for rejection
 * @returns {Promise<*>} a promise of the value type
 */
function delayed(ms, value, rejectionReason) {
  var error;
  if (rejectionReason) {
    error = new Error(rejectionReason);
  }
  return new Promise(function (resolve, reject) {
    var id = setTimeout(function () {
      clearTimeout(id);
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    }, ms);
  });
}

// test suite
describe('SlackMessageAdapter', function () {
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

  // helpers
  /**
   * Encapsulates knowledge of adapter handler registration internals and asserts that a handler
   * was registered.
   *
   * @param {SlackMessageAdapter} adapter actual instance where handler should be registered
   * @param {Function} handler expected registered function
   * @param {Object} [constraints] expected constraints for which handler should be registered
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

  describe('#action()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
    });
    it('should fail action registration without handler', function () {
      assert.throws(function () {
        this.adapter.action('my_callback');
      }, TypeError);
    });

    // execute shared tests
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

    // execute shared tests
    shouldRegisterWithCallbackId('options');
  });

  describe('#dispatch()', function () {
    beforeEach(function () {
      this.adapter = new SlackMessageAdapter(workingVerificationToken);
      this.synchronousTimeout = 2500;
    });

    /**
     * Assert the result of a dispatch contains a certain message
     * @param {Object} response actual return value of adapter.dispatch (synchronous reponse)
     * @param {Object|string|undefined} message expected value of response body
     * @returns {Promise<void>}
     */
    function assertResponseContainsMessage(response, message) {
      return Promise.resolve(response.content)
        .then(function (content) {
          assert.deepEqual(content, message);
        });
    }

    /**
     * Encapsulates knowledge of how the adapter makes post requests by arranging a stub that can
     * observe these requests and verify that one is made to the given url with the given message.
     * If less than all of the messages are matched, if a request is mad and the body doesn't match
     * and messages, or if the url doesn't match the requestUrl, this will result in a timeout (a
     * promise that never resolves nor rejects).
     * @param {SlackMessageAdapter} adapter actual adapter
     * @param {string} requestUrl expected request URL
     * @param {...Object|string} messages expected messages in request body
     */
    function assertPostRequestMadeWithMessages(adapter, requestUrl) {
      var messages = [].slice.call(arguments, 2);
      var messagePromiseEntries = messages.map(function () {
        var entry = {};
        entry.promise = new Promise(function (resolve) {
          entry.resolve = resolve;
        });
        return entry;
      });

      sinon.stub(adapter.axios, 'post').callsFake(function (url, body) {
        var messageIndex;
        if (url !== requestUrl) {
          return;
        }
        messageIndex = messages.findIndex(function (message) {
          try {
            assert.deepEqual(body, message);
            return true;
          } catch (_) {
            return false;
          }
        });
        if (messageIndex >= 0) {
          messagePromiseEntries[messageIndex].resolve();
        }
      });

      return Promise.all(messagePromiseEntries.map(function (entry) {
        return entry.promise;
      }));
    }

    // NOTE: the middleware has to check the verification token, poweredBy headers
    describe('when dispatching a message action request', function () {
      beforeEach(function () {
        this.requestPayload = {
          type: 'interactive_message',
          callback_id: 'id',
          actions: [{}],
          response_url: 'https://example.com'
        };
        this.replacement = { text: 'example replacement message' };
      });
      it('should handle the callback returning a message with a synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var replacement = this.replacement;
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return replacement;
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, replacement);
      });
      it('should handle the callback returning a promise of a message before the timeout with a ' +
         'synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var replacement = this.replacement;
        var timeout = this.synchronousTimeout;
        this.timeout(timeout);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return delayed(timeout * 0.1, replacement);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, replacement);
      });
      it('should handle the callback returning a promise of a message after the timeout with an ' +
         'asynchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var replacement = this.replacement;
        var expectedAsyncRequest = assertPostRequestMadeWithMessages(
          this.adapter,
          requestPayload.response_url,
          replacement
        );
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return delayed(timeout + 20, replacement);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.all([
          assertResponseContainsMessage(dispatchResponse, ''),
          expectedAsyncRequest
        ]);
      });
      it('should handle the callback returning nothing and using respond to send a message', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var replacement = this.replacement;
        var expectedAsyncRequest = assertPostRequestMadeWithMessages(
          this.adapter,
          requestPayload.response_url,
          replacement
        );
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          delayed(timeout + 20)
            .then(function () {
              respond(replacement);
            });
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.all([
          assertResponseContainsMessage(dispatchResponse, ''),
          expectedAsyncRequest
        ]);
      });
      it('should handle the callback returning a promise of a message after the timeout with an ' +
         'asynchronous response and using respond to send another asynchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var firstReplacement = this.replacement;
        var secondReplacement = Object.assign({}, firstReplacement, { text: '2nd replacement' });
        var expectedAsyncRequest = assertPostRequestMadeWithMessages(
          this.adapter,
          requestPayload.response_url,
          firstReplacement,
          secondReplacement
        );
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          delayed(timeout + 30)
            .then(function () {
              respond(secondReplacement);
            });
          return delayed(timeout + 20, firstReplacement);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.all([
          assertResponseContainsMessage(dispatchResponse, ''),
          expectedAsyncRequest
        ]);
      });
      it('should handle the callback returning nothing with a synchronous response and using ' +
         'respond to send multiple asynchronous responses', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var firstReplacement = this.replacement;
        var secondReplacement = Object.assign({}, firstReplacement, { text: '2nd replacement' });
        var expectedAsyncRequest = assertPostRequestMadeWithMessages(
          this.adapter,
          requestPayload.response_url,
          firstReplacement,
          secondReplacement
        );
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          delayed(timeout + 20)
            .then(function () {
              respond(firstReplacement);
              return delayed(10);
            })
            .then(function () {
              respond(secondReplacement);
            });
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.all([
          assertResponseContainsMessage(dispatchResponse, ''),
          expectedAsyncRequest
        ]);
      });
    });

    describe('when dispatching a dialog submission request', function () {
      beforeEach(function () {
        this.requestPayload = {
          type: 'dialog_submission',
          callback_id: 'id',
          submission: {
            email_address: 'ankur@h4x0r.com'
          },
          response_url: 'https://example.com'
        };
        this.submissionResponse = {
          errors: [
            {
              name: 'email_address',
              error: 'Sorry, this email domain is not authorized!'
            }
          ]
        };
        this.followUp = { text: 'thanks for submitting your email address' };
      });
      it('should handle the callback returning a message with a synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var submissionResponse = this.submissionResponse;
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return submissionResponse;
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, submissionResponse);
      });

      it('should handle the callback returning a promise of a message before the timeout with a ' +
         'synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var submissionResponse = this.submissionResponse;
        var timeout = this.synchronousTimeout;
        this.timeout(timeout);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return delayed(timeout * 0.1, submissionResponse);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, submissionResponse);
      });

      it('should handle the callback returning a promise of a message after the timeout with a ' +
         'synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var submissionResponse = this.submissionResponse;
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
          return delayed(timeout + 20, submissionResponse);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, submissionResponse);
      });

      it('should handle the callback returning nothing with a synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          assert.deepEqual(payload, requestPayload);
          assert.isFunction(respond);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, '');
      });

      it('should handle the callback using respond to send a follow up message', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var followUp = this.followUp;
        var expectedAsyncRequest = assertPostRequestMadeWithMessages(
          this.adapter,
          requestPayload.response_url,
          followUp
        );
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, respond) {
          delayed(timeout + 20)
            .then(function () {
              respond(followUp);
            });
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return Promise.all([
          assertResponseContainsMessage(dispatchResponse, ''),
          expectedAsyncRequest
        ]);
      });
    });

    describe('when dispatching a menu options request', function () {
      beforeEach(function () {
        this.requestPayload = {
          name: 'bug_name',
          value: 'TRAC-12',
          type: 'interactive_message',
          callback_id: 'id'
        };
        this.optionsResponse = {
          options: [
            {
              text: 'Buggy McBugface',
              value: 'TRAC-12345'
            }
          ]
        };
      });
      it('should handle the callback returning options with a synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var optionsResponse = this.optionsResponse;
        this.adapter.action(requestPayload.callback_id, function (payload, secondArg) {
          assert.deepEqual(payload, requestPayload);
          assert.isUndefined(secondArg);
          return optionsResponse;
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, optionsResponse);
      });

      it('should handle the callback returning a promise of options before the timeout with a ' +
         'synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var optionsResponse = this.optionsResponse;
        var timeout = this.synchronousTimeout;
        this.timeout(timeout);
        this.adapter.action(requestPayload.callback_id, function (payload, secondArg) {
          assert.deepEqual(payload, requestPayload);
          assert.isUndefined(secondArg);
          return delayed(timeout * 0.1, optionsResponse);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, optionsResponse);
      });

      it('should handle the callback returning a promise of options after the timeout with a ' +
         'synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        var optionsResponse = this.optionsResponse;
        var timeout = this.synchronousTimeout;
        this.timeout(timeout * 1.5);
        this.adapter.action(requestPayload.callback_id, function (payload, secondArg) {
          assert.deepEqual(payload, requestPayload);
          assert.isUndefined(secondArg);
          return delayed(timeout + 20, optionsResponse);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, optionsResponse);
      });

      it('should handle the callback returning nothing with a synchronous response', function () {
        var dispatchResponse;
        var requestPayload = this.requestPayload;
        this.adapter.action(requestPayload.callback_id, function (payload, secondArg) {
          assert.deepEqual(payload, requestPayload);
          assert.isUndefined(secondArg);
        });
        dispatchResponse = this.adapter.dispatch(requestPayload);
        assert.equal(dispatchResponse.status, 200);
        return assertResponseContainsMessage(dispatchResponse, '');
      });
    });
  });
});
