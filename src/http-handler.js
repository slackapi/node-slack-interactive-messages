import debugFactory from 'debug';
import { packageIdentifier } from './util';
import qs from 'qs';
import crypto from 'crypto';

export const errorCodes = {
  TOKEN_VERIFICATION_FAILURE: 'SLACKMESSAGEMIDDLEWARE_TOKEN_VERIFICATION_FAILURE',
  SIGNATURE_VERIFICATION_FAILURE: 'SLACKMESSAGEMIDDLEWARE_REQUEST_SIGNATURE_VERIFICATION_FAILURE',
  REQUEST_TIME_FAILURE: 'SLACKMESSAGEMIDDLEWARE_REQUEST_TIMELIMIT_FAILURE',
  NO_BODY: 'SLACKMESSAGEMIDDLEWARE_BODY_FAILURE'
};

const debug = debugFactory('@slack/interactive-messages:http-handler');

export function createHTTPHandler(adapter) {
	const poweredBy = packageIdentifier();

	function sendResponse(res) {
    return function _sendResponse(dispatchResult) {
      const { status, content } = dispatchResult;

      res.statusCode = status;
      res.setHeader('X-Slack-Powered-By', poweredBy);

      if (typeof content === 'string') {
        res.send(content);
      } else if (content) {
        res.json(content);
      } else {
        res.end();
      }
    };
  }

  function buildRawBody(req) {
    return new Promise(function(resolve, reject) {
      let body = [];

      req.on('error', (err) => {
        
        reject(err);
      }).on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        const rawBody = Buffer.concat(body).toString();
        resolve(rawBody);
      })
    })
    
  }

  function parseBody(req, body) {
    const type = req.headers['content-type'];

    if (type === 'application/x-www-form-urlencoded') {
      body = qs.parse(body);
    } else if (type === 'application/json') {
      body = JSON.parse(body);
    }


    // Is this possible since we're parsing the body ourselves
    if (!body) {
      const error = new Error('The incoming HTTP request did not have a body.');
      error.code = errorCodes.NO_BODY;
      throw error;
      return;
    }
    return body;
  }

  return function slackMessageAdapterMiddleware(req, res) {

    debug('request received - method: %s, path: %s', req.method, req.url);
    // Builds body of the request from stream and returns the raw request body
    buildRawBody(req)
    .then((rawBody) => {
      if (!rawBody) return false;

      // Verify the request signature
      const requestIsVerified = verifyRequestSignature(adapter.verificationToken, req, rawBody);

      if (requestIsVerified) {
        // Function used to send response
        const respond = sendResponse(res);
        // Parse raw body
        const body = parseBody(req, rawBody);
        // Invalid body, error already thrown
        if (!body) return false;

        if (body.ssl_check) {
          respond({ status: 200 });
          return;
        }

        const dispatchResult = adapter.dispatch(JSON.parse(body.payload));

        if (dispatchResult) {
          dispatchResult.then(respond);
        } else {

        }
      } else {
        return false;
      }
    }).catch((err) => {
      const error = new Error('The HTTP request did not have a valid body');
      error.code = errorCodes.BODY_PARSING_FAILED;
      throw error;
    })
  }

  /**
   * Method to verify signature of requests
   *
   * @param {req} Request
   * @param {res} Response
   * @param {rawBody} Raw request body
   * @returns {boolean} Indicates if request is verified
   */

  function verifyRequestSignature(signingSecret, req, rawBody) {
    // Request signature
    const signature = req.headers['x-slack-signature'];
    // Request timestamp
    const ts = req.headers['x-slack-request-timestamp'];

    // Divide current date to match Slack ts format
    // Subtract 5 minutes from current time
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60*5);

    if (ts < fiveMinutesAgo) {
      debug('request is older than 5 minutes');
      const error = new Error('Slack request signing verification failed');
      error.code = errorCodes.REQUEST_TIME_FAILURE;

      //TODO: is this right for throwing an error here? I'm unsure
      throw error;
      return false;
    }

    const hmac = crypto.createHmac('sha256', signingSecret);
    const [version, hash] = signature.split('=');
    hmac.update(`${version}:${ts}:${rawBody}`);

    if (hash !== hmac.digest('hex')) {
      debug('Request signature is not valid');
      const error = new Error('Slack request signing verification failed');
      error.code = errorCodes.SIGNATURE_VERIFICATION_FAILURE;
      throw error;
      return false;
    }

    debug('request signing verification success');
    return true;
  }
}
