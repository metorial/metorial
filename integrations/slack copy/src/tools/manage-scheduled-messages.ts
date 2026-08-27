import { createManageScheduledMessagesTool } from '@slates/slack-tools';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let manageScheduledMessages = createManageScheduledMessagesTool({
  spec,
  SlackClient,
  scopes: {
    manageScheduledMessages: slackActionScopes.chatWrite
  }
});
