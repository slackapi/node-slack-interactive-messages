## Modules

<dl>
<dt><a href="#module_adapter">adapter</a></dt>
<dd></dd>
<dt><a href="#module_@slack/interactive-messages">@slack/interactive-messages</a></dt>
<dd></dd>
</dl>

<a name="module_adapter"></a>

## adapter

* [adapter](#module_adapter)
    * [module.exports](#exp_module_adapter--module.exports) ⏏
        * [~SlackMessageAdapter](#module_adapter--module.exports..SlackMessageAdapter)
            * [new SlackMessageAdapter(verificationToken, [options])](#new_module_adapter--module.exports..SlackMessageAdapter_new)
            * _instance_
                * [.createServer([path])](#module_adapter--module.exports..SlackMessageAdapter+createServer) ⇒ <code>Promise.&lt;NodeHttpServer&gt;</code>
                * [.start(port)](#module_adapter--module.exports..SlackMessageAdapter+start) ⇒ <code>Promise.&lt;void&gt;</code>
                * [.stop()](#module_adapter--module.exports..SlackMessageAdapter+stop) ⇒ <code>Promise.&lt;void&gt;</code>
                * [.expressMiddleware()](#module_adapter--module.exports..SlackMessageAdapter+expressMiddleware) ⇒ <code>ExpressMiddlewareFunc</code>
                * [.action(matchingConstraints, callback)](#module_adapter--module.exports..SlackMessageAdapter+action) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
                * [.options(matchingConstraints, callback)](#module_adapter--module.exports..SlackMessageAdapter+options) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
            * _inner_
                * [~ActionHandler(payload, respond)](#module_adapter--module.exports..SlackMessageAdapter..ActionHandler)
                * [~OptionsHandler(payload)](#module_adapter--module.exports..SlackMessageAdapter..OptionsHandler)


* * *

<a name="exp_module_adapter--module.exports"></a>

### module.exports ⏏
**Kind**: Exported member  

* * *

<a name="module_adapter--module.exports..SlackMessageAdapter"></a>

#### module.exports~SlackMessageAdapter
An adapter for Slack's interactive message components such as buttons, menus, and dialogs.

**Kind**: inner class of [<code>module.exports</code>](#exp_module_adapter--module.exports)  

* [~SlackMessageAdapter](#module_adapter--module.exports..SlackMessageAdapter)
    * [new SlackMessageAdapter(verificationToken, [options])](#new_module_adapter--module.exports..SlackMessageAdapter_new)
    * _instance_
        * [.createServer([path])](#module_adapter--module.exports..SlackMessageAdapter+createServer) ⇒ <code>Promise.&lt;NodeHttpServer&gt;</code>
        * [.start(port)](#module_adapter--module.exports..SlackMessageAdapter+start) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.stop()](#module_adapter--module.exports..SlackMessageAdapter+stop) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.expressMiddleware()](#module_adapter--module.exports..SlackMessageAdapter+expressMiddleware) ⇒ <code>ExpressMiddlewareFunc</code>
        * [.action(matchingConstraints, callback)](#module_adapter--module.exports..SlackMessageAdapter+action) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
        * [.options(matchingConstraints, callback)](#module_adapter--module.exports..SlackMessageAdapter+options) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
    * _inner_
        * [~ActionHandler(payload, respond)](#module_adapter--module.exports..SlackMessageAdapter..ActionHandler)
        * [~OptionsHandler(payload)](#module_adapter--module.exports..SlackMessageAdapter..OptionsHandler)


* * *

<a name="new_module_adapter--module.exports..SlackMessageAdapter_new"></a>

##### new SlackMessageAdapter(verificationToken, [options])
Create a message adapter.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| verificationToken | <code>string</code> |  | Slack app verification token used to authenticate request |
| [options] | <code>Object</code> |  |  |
| [options.syncResponseTimeout] | <code>number</code> | <code>2500</code> | number of milliseconds to wait before flushing a syncrhonous response to an incoming request and falling back to an asynchronous response. |
| [options.lateResponseFallbackEnabled] | <code>boolean</code> | <code>true</code> | whether or not promises that resolve after the syncResponseTimeout can fallback to a request for the response_url. this only works in cases where the semantic meaning of the response and the response_url are the same. |


* * *

<a name="module_adapter--module.exports..SlackMessageAdapter+createServer"></a>

##### slackMessages.createServer([path]) ⇒ <code>Promise.&lt;NodeHttpServer&gt;</code>
Create a server that dispatches Slack's interactive message actions and menu requests to this
message adapter instance. Use this method if your application will handle starting the server.

**Kind**: instance method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  
**Returns**: <code>Promise.&lt;NodeHttpServer&gt;</code> - - A promise that resolves to an instance of http.Server and
will dispatch interactive message actions and options requests to this message adapter instance  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [path] | <code>string</code> | <code>&quot;/slack/actions&quot;</code> | The path portion of the URL where the server will listen for requests from Slack's interactive messages. |


* * *

<a name="module_adapter--module.exports..SlackMessageAdapter+start"></a>

##### slackMessages.start(port) ⇒ <code>Promise.&lt;void&gt;</code>
Start a built-in server that dispatches Slack's interactive message actions and menu requests
to this message adapter interface.

**Kind**: instance method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - A promise that resolves once the server is ready  

| Param | Type |
| --- | --- |
| port | <code>number</code> | 


* * *

<a name="module_adapter--module.exports..SlackMessageAdapter+stop"></a>

##### slackMessages.stop() ⇒ <code>Promise.&lt;void&gt;</code>
Stop the previously started built-in server.

**Kind**: instance method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - A promise that resolves once the server is cleaned up.  

* * *

<a name="module_adapter--module.exports..SlackMessageAdapter+expressMiddleware"></a>

##### slackMessages.expressMiddleware() ⇒ <code>ExpressMiddlewareFunc</code>
Create a middleware function that can be used to integrate with the `express` web framework
in order for incoming requests to be dispatched to this message adapter instance.

**Kind**: instance method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  
**Returns**: <code>ExpressMiddlewareFunc</code> - - A middleware function  

* * *

<a name="module_adapter--module.exports..SlackMessageAdapter+action"></a>

##### slackMessages.action(matchingConstraints, callback) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
Add a handler for an interactive message action.

**Kind**: instance method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| matchingConstraints | <code>Object</code> \| <code>string</code> \| <code>RegExp</code> | the callback ID (as a string or RegExp) or an object describing the constrants to select actions for the handler. |
| matchingConstraints.callbackId | <code>string</code> \| <code>RegExp</code> |  |
| matchingConstraints.type | <code>string</code> |  |
| matchingConstraints.unfurl | <code>boolean</code> |  |
| callback | [<code>ActionHandler</code>](#module_adapter--module.exports..SlackMessageAdapter..ActionHandler) |  |


* * *

<a name="module_adapter--module.exports..SlackMessageAdapter+options"></a>

##### slackMessages.options(matchingConstraints, callback) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
Add a handler for an options request

**Kind**: instance method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  

| Param | Type | Description |
| --- | --- | --- |
| matchingConstraints | <code>\*</code> | the callback ID (as a string or RegExp) or an object describing the constrants to select options requests for the handler. |
| matchingConstraints.callbackId | <code>string</code> \| <code>RegExp</code> |  |
| matchingConstraints.type | <code>string</code> |  |
| matchingConstraints.unfurl | <code>boolean</code> |  |
| callback | [<code>OptionsHandler</code>](#module_adapter--module.exports..SlackMessageAdapter..OptionsHandler) |  |


* * *

<a name="module_adapter--module.exports..SlackMessageAdapter..ActionHandler"></a>

##### SlackMessageAdapter~ActionHandler(payload, respond)
**Kind**: inner method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  

| Param | Type |
| --- | --- |
| payload | <code>object</code> | 
| respond | <code>function</code> | 


* * *

<a name="module_adapter--module.exports..SlackMessageAdapter..OptionsHandler"></a>

##### SlackMessageAdapter~OptionsHandler(payload)
**Kind**: inner method of [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)  

| Param | Type |
| --- | --- |
| payload | <code>object</code> | 


* * *

<a name="module_@slack/interactive-messages"></a>

## @slack/interactive-messages

* [@slack/interactive-messages](#module_@slack/interactive-messages)
    * [.errorCodes](#module_@slack/interactive-messages.errorCodes) : <code>enum</code>
    * [.createMessageAdapter(verificationToken, options)](#module_@slack/interactive-messages.createMessageAdapter) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)


* * *

<a name="module_@slack/interactive-messages.errorCodes"></a>

### @slack/interactive-messages.errorCodes : <code>enum</code>
Dictionary of error codes that may appear on errors emitted from this package's objects

**Kind**: static enum of [<code>@slack/interactive-messages</code>](#module_@slack/interactive-messages)  
**Read only**: true  

* * *

<a name="module_@slack/interactive-messages.createMessageAdapter"></a>

### @slack/interactive-messages.createMessageAdapter(verificationToken, options) ⇒ [<code>SlackMessageAdapter</code>](#module_adapter--module.exports..SlackMessageAdapter)
Factory method to create an instance of [SlackMessageAdapter](#new_module_adapter--module.exports..SlackMessageAdapter_new)

**Kind**: static method of [<code>@slack/interactive-messages</code>](#module_@slack/interactive-messages)  

| Param | Type |
| --- | --- |
| verificationToken | <code>string</code> | 
| options | <code>Object</code> | 


* * *

