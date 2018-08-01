var assert = require('chai').assert;
var sinon = require('sinon');
var crypto = require('crypto');
var proxyquire = require('proxyquire');
var correctRawBody = 'payload=%7B%22type%22%3A%22interactive_message%22%7D';
var getRawBodyStub = sinon.stub();
var systemUnderTest = proxyquire('../../dist/http-handler', {
  'raw-body': getRawBodyStub
});
var createHTTPHandler = systemUnderTest.createHTTPHandler;
// fixtures
var correctSigningSecret = 'SIGNING_SECRET';
var requestSigningVersion = 'v0';

function createRequestSignature(signingSecret, ts, rawBody) {
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(`${requestSigningVersion}:${ts}:${rawBody}`);
  return `${requestSigningVersion}=${hmac.digest('hex')}`;
}

function createRequest(rawBody, signingSecret, ts) {
  const signature = createRequestSignature(signingSecret, ts, rawBody);
  const headers = {
    'x-slack-signature': signature,
    'x-slack-request-timestamp': ts,
    'content-type': 'application/x-www-form-urlencoded'
  };
  return {
    body: rawBody,
    headers: headers
  };
}


describe('createHTTPHandler', function () {
  beforeEach(function () {
    this.dispatch = sinon.stub();
    this.res = sinon.stub({
      status: function () { },
      setHeader: function () { },
      set: function () { },
      send: function () { },
      json: function () { },
      end: function () { }
    });
    this.next = sinon.stub();
    this.parseBody = sinon.stub();

    this.middleware = createHTTPHandler({
      signingSecret: correctSigningSecret,
      dispatch: this.dispatch
    });
  });

  it('should verify a correct signing secret', function (done) {
    var dispatch = this.dispatch;
    var res = this.res;
    var req = createRequest(correctRawBody, correctSigningSecret, Math.floor(Date.now() / 1000));
    dispatch.resolves({ status: 200 });
    getRawBodyStub.resolves(correctRawBody);
    res.end.callsFake(function () {
      assert(dispatch.called);
      assert.equal(res.statusCode, 200);
      done();
    });
    this.middleware(req, res);
  });

  it('should fail request signing verification with an incorrect signing secret', function (done) {
    var dispatch = this.dispatch;
    var res = this.res;
    var req = createRequest(correctRawBody, 'INVALID_SECRET', Math.floor(Date.now() / 1000));
    getRawBodyStub.resolves(correctRawBody);
    res.end.callsFake(function () {
      assert(dispatch.notCalled);
      assert.equal(res.statusCode, 404);
      done();
    });
    this.middleware(req, res);
  });

  it('should fail request signing verification with old timestamp', function (done) {
    var dispatch = this.dispatch;
    var res = this.res;
    var sixMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 6);
    var req = createRequest(correctRawBody, correctSigningSecret, sixMinutesAgo);
    getRawBodyStub.resolves(correctRawBody);
    res.end.callsFake(function () {
      assert(dispatch.notCalled);
      assert.equal(res.statusCode, 404);
      done();
    });
    this.middleware(req, res);
  });

  it('should set an identification header in its responses', function (done) {
    var dispatch = this.dispatch;
    var res = this.res;
    var req = createRequest(correctRawBody, correctSigningSecret, Math.floor(Date.now() / 1000));
    dispatch.resolves({ status: 200 });
    getRawBodyStub.resolves(correctRawBody);
    res.end.callsFake(function () {
      assert(res.setHeader.calledWith('X-Slack-Powered-By'));
      done();
    });
    this.middleware(req, res);
  });

  it('should respond to ssl check requests', function (done) {
    var dispatch = this.dispatch;
    var parseBody = this.parseBody;
    var res = this.res;
    var req = createRequest(correctRawBody, correctSigningSecret, Math.floor(Date.now() / 1000));
    var sslRawBody = '%7B%20body%3A%20%7B%20ssl_check%3A%201%20%7D%20%7D';
    getRawBodyStub.resolves(sslRawBody);
    parseBody.returns({ body: { ssl_check: 1 } });
    res.end.callsFake(function () {
      assert(dispatch.notCalled);
      done();
    });
    this.middleware(req, res);
  });

  describe('handling dispatch results', function () {
    it('should serialize objects in the content key as JSON', function (done) {
      var dispatch = this.dispatch;
      var res = this.res;
      var req = createRequest(correctRawBody, correctSigningSecret, Math.floor(Date.now() / 1000));
      var content = {
        abc: 'def',
        ghi: true,
        jkl: ['m', 'n', 'o'],
        p: 5
      };
      dispatch.resolves({ status: 200, content: content });
      getRawBodyStub.resolves(correctRawBody);
      res.end.callsFake(function (json) {
        assert(dispatch.called);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(json, JSON.stringify(content));
        done();
      });
      this.middleware(req, res);
    });

    it('should handle an undefined content key as no body', function (done) {
      var dispatch = this.dispatch;
      var res = this.res;
      var req = createRequest(correctRawBody, correctSigningSecret, Math.floor(Date.now() / 1000));
      dispatch.resolves({ status: 500 });
      getRawBodyStub.resolves(correctRawBody);
      res.end.callsFake(function () {
        assert(dispatch.called);
        assert.equal(res.statusCode, 500);
        done();
      });
      this.middleware(req, res);
    });

    it('should handle a string content key as the literal body', function (done) {
      var dispatch = this.dispatch;
      var res = this.res;
      var req = createRequest(correctRawBody, correctSigningSecret, Math.floor(Date.now() / 1000));
      var content = 'hello, world';
      dispatch.resolves({ status: 200, content: content });
      getRawBodyStub.resolves(correctRawBody);
      res.end.callsFake(function (body) {
        assert(dispatch.called);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(body, content);
        done();
      });
      this.middleware(req, res);
    });
  });
});
