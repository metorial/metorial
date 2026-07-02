import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  getInsightsTool,
  getMediaTool,
  getMentionsTool,
  getProfileTool,
  getPublishingLimitTool,
  getStoriesTool,
  manageCommentsTool,
  publishMediaTool,
  searchHashtagsTool,
  sendMessageTool
} from './tools';
import { newMediaTrigger, webhookEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getProfileTool,
    getMediaTool,
    publishMediaTool,
    manageCommentsTool,
    getInsightsTool,
    searchHashtagsTool,
    sendMessageTool,
    getMentionsTool,
    getStoriesTool,
    getPublishingLimitTool
  ],
  triggers: [newMediaTrigger, webhookEventsTrigger]
});
