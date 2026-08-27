import { createGetConversationInfoTool } from '@slates/slack-tools';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let getConversationInfo = createGetConversationInfoTool({
  spec,
  SlackClient,
  scopes: {
    getConversationInfo: slackActionScopes.conversationRead
  }
});
