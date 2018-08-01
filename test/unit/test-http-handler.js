var assert = require('chai').assert;
var sinon = require('sinon');
var crypto = require('crypto');
var proxyquire = require('proxyquire');
var correctRawBody = 'payload=%7B%22type%22%3A%22interactive_message%22%7D';
var getRawBodyStub = sinon.stub().resolves(correctRawBody);
var systemUnderTest = proxyquire('../../dist/http-handler', {
  'raw-body': getRawBodyStub
});
var createHTTPHandler = systemUnderTest.createHTTPHandler;
var errorCodes = systemUnderTest.errorCodes;
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
    res.end.callsFake(function () {
      assert(dispatch.called);
      assert.equal(res.statusCode, 200);
      done();
    });
    this.middleware(req, res);
  });

  it('should fail token verification with an incorrect token', function (done) {
    var res = this.res;
    this.next.callsFake(function (error) {
      assert.equal(error.code, errorCodes.TOKEN_VERIFICATION_FAILURE);
      assert(res.end.notCalled);
      done();
    });
    this.middleware(createRequest({ token: 'INVALID_TOKEN' }), res, this.next);
  });

  it('should set an identification header in its responses', function (done) {
    var dispatch = this.dispatch;
    var res = this.res;
    dispatch.resolves({ status: 200 });
    res.end.callsFake(function () {
      assert(res.set.calledWith('X-Slack-Powered-By'));
      done();
    });
    this.middleware(createRequest({ token: correctSigningSecret }), res, this.next);
  });

  it('should respond to ssl check requests', function (done) {
    var dispatch = this.dispatch;
    var res = this.res;
    res.end.callsFake(function () {
      assert(dispatch.notCalled);
      done();
    });
    this.middleware({ body: { ssl_check: 1 } }, res, this.next);
  });

  describe('handling dispatch results', function () {
    it('should serialize objects in the content key as JSON', function (done) {
      var dispatch = this.dispatch;
      var res = this.res;
      var content = {
        abc: 'def',
        ghi: true,
        jkl: ['m', 'n', 'o'],
        p: 5
      };
      dispatch.resolves({ status: 200, content: content });
      res.json.callsFake(function (json) {
        assert(dispatch.called);
        assert(res.status.calledWith(200));
        assert.deepEqual(json, content);
        done();
      });
      this.middleware(createRequest({ token: correctSigningSecret }), res, this.next);
    });

    it('should handle an undefined content key as no body', function (done) {
      var dispatch = this.dispatch;
      var res = this.res;
      dispatch.resolves({ status: 500 });
      res.end.callsFake(function () {
        assert(dispatch.called);
        assert(res.status.calledWith(500));
        done();
      });
      this.middleware(createRequest({ token: correctSigningSecret }), res, this.next);
    });

    it('should handle a string content key as the literal body', function (done) {
      var dispatch = this.dispatch;
      var res = this.res;
      var content = 'hello, world';
      dispatch.resolves({ status: 200, content: content });
      res.send.callsFake(function (body) {
        assert(dispatch.called);
        assert(res.status.calledWith(200));
        assert.deepEqual(body, content);
        done();
      });
      this.middleware(createRequest({ token: correctSigningSecret }), res, this.next);
    });
  });

  // express-specific
  it('should fail when the request body is not parsed', function (done) {
    var res = this.res;
    this.next.callsFake(function (error) {
      assert.equal(error.code, errorCodes.NO_BODY_PARSER);
      assert(res.end.notCalled);
      done();
    });
    this.middleware({ notBody: 'someValue' }, res, this.next);
  });

  it('should forward unmatched dispatches to the next middleware', function () {
    this.dispatch.returns(undefined);
    this.middleware(createRequest({ token: correctSigningSecret }), this.res, this.next);
    assert(this.dispatch.called);
    assert(this.next.called);
    assert.equal(this.next.firstCall.args.length, 0);
  });
});
