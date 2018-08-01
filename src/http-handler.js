import debugFactory from 'debug';
import getRawBody from 'raw-body';
import qs from 'qs';
import crypto from 'crypto';
import { packageIdentifier } from './util';

export const errorCodes = {
  SIGNATURE_VERIFICATION_FAILURE: 'SLACKMESSAGEMIDDLEWARE_REQUEST_SIGNATURE_VERIFICATION_FAILURE',
  REQUEST_TIME_FAILURE: 'SLACKMESSAGEMIDDLEWARE_REQUEST_TIMELIMIT_FAILURE',
  BODY_PARSING_FAILED: 'SLACKMESSAGEMIDDLEWARE_BODY_PARSING_FAILURE',
  BODY_PARSER_NOT_PERMITTED: 'SLACKMESSAGEMIDDLEWARE_BODY_PARSER_NOT_PERMITTED_FAILURE',
};

const debug = debugFactory('@slack/interactive-messages:http-handler');

export function createHTTPHandler(adapter) {
  const poweredBy = packageIdentifier();

  /**
   * Parses raw bodies of requests
   *
   * @param {Object} res - Response object
   * @returns {Function} Returns a function used to send response
   */
  function sendResponse(res) {
    return function _sendResponse(dispatchResult) {
      const { status, content } = dispatchResult;
      res.statusCode = status;
      res.setHeader('X-Slack-Powered-By', poweredBy);
      if (typeof content === 'string') {
        res.end(content);
      } else if (content) {
        res.end(JSON.stringify(content));
      } else {
        res.end();
      }
    };
  }

  /**
   * Parses raw bodies of requests
   *
   * @param {Object} req - Request object
   * @param {string} body - Raw body of request
   * @returns {Object} Parsed body of the request
   */
  function parseBody(req, body) {
    const type = req.headers['content-type'];

    if (type === 'application/x-www-form-urlencoded') {
      return qs.parse(body);
    } else if (type === 'application/json') {
      return JSON.parse(body);
    }
    return false;
  }

  /**
   * Method to verify signature of requests
   *
   * @param {string} signingSecret - Signing secret used to verify request signature
   * @param {Object} req - Request object
   * @param {string} rawBody - String of raw body
   * @returns {boolean} Indicates if request is verified
   */
  function verifyRequestSignature(signingSecret, req, rawBody) {
    // Request signature
    const signature = req.headers['x-slack-signature'];
    // Request timestamp
    const ts = req.headers['x-slack-request-timestamp'];

    // Divide current date to match Slack ts format
    // Subtract 5 minutes from current time
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);

    if (ts < fiveMinutesAgo) {
      debug('request is older than 5 minutes');
      const error = new Error('Slack request signing verification failed');
      error.code = errorCodes.REQUEST_TIME_FAILURE;
      throw error;
    }

    const hmac = crypto.createHmac('sha256', signingSecret);
    const [version, hash] = signature.split('=');
    hmac.update(`${version}:${ts}:${rawBody}`);

    if (hash !== hmac.digest('hex')) {
      debug('request signature is not valid');
      const error = new Error('Slack request signing verification failed');
      error.code = errorCodes.SIGNATURE_VERIFICATION_FAILURE;
      throw error;
    }

    debug('request signing verification success');
    return true;
  }

  /**
   * Middleware used to handle Slack requests and send responses and
   * verify request signatures
   *
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  return function slackMessageAdapterMiddleware(req, res) {
    debug('request received - method: %s, path: %s', req.method, req.url);
    // Function used to send response
    const respond = sendResponse(res);

    // Builds body of the request from stream and returns the raw request body
    getRawBody(req)
      .then((r) => {
        const rawBody = r.toString();

        if (verifyRequestSignature(adapter.signingSecret, req, rawBody)) {
          // Request signature is verified
          // Parse raw body
          const body = parseBody(req, rawBody);

          if (body.ssl_check) {
            respond({ status: 200 });
            return;
          }

          const dispatchResult = adapter.dispatch(JSON.parse(body.payload));

          if (dispatchResult) {
            dispatchResult.then(respond);
          }
        }
      }).catch((error) => {
        if (error.code === errorCodes.SIGNATURE_VERIFICATION_FAILURE ||
          error.code === errorCodes.REQUEST_TIME_FAILURE) {
          respond({ status: 404 });
        } else {
          throw error;
        }
      });
  };
}
