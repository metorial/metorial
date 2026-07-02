import { Slate } from 'slates';
import { spec } from './spec';
import { pollMessages, publishMessage, updateNotification } from './tools';
import { inboundWebhook, topicMessages } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [publishMessage, pollMessages, updateNotification],
  triggers: [inboundWebhook, topicMessages]
});
