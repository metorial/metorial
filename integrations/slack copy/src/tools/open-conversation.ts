import { createOpenConversationTool } from '@slates/slack-tools';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let openConversation = createOpenConversationTool({
  spec,
  SlackClient,
  scopes: {
    openConversation: slackActionScopes.openConversation
  }
});
