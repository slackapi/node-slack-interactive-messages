# ⚠️ This project has been moved to [slackapi/node-slack-sdk](https://github.com/slackapi/node-slack-sdk)

## Slack Interactive Messages for Node

Build your Slack Apps with rich and engaging user interactions using block actions, buttons, menus, 
and dialogs. The package will help you start with sensible and secure defaults.

The adapter gives you a meaningful API to handle actions from all of Slack's interactive
message components
[actions block elements](https://api.slack.com/reference/messaging/interactive-components),
([buttons](https://api.slack.com/docs/message-buttons),
[menus](https://api.slack.com/docs/message-menus),
and [dialogs](https://api.slack.com/dialogs)). Use it as an independent HTTP server or plug it into
an existing server as [Express](http://expressjs.com/) middleware.

This package does **not** help you compose messages with action blocks, buttons, menus and dialogs
to trigger the actions. We recommend using the
[Block Kit Builder](https://api.slack.com/tools/block-kit-builder) to design interactive Block Kit
messages and the [Message Builder](https://api.slack.com/docs/messages/builder) to design legacy
interactive messages. You can send these messages to Slack using the Web API, Incoming Webhooks,
and other parts of the platform.

### Support

Need help? Join the [Bot Developer Hangout](https://community.botkit.ai/) team and talk to us in
[#slack-api](https://dev4slack.slack.com/messages/slack-api/).

You can also [create an Issue](https://github.com/slackapi/node-slack-sdk/issues/new)
right here on GitHub.
