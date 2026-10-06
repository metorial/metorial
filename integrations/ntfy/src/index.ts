import { Slate } from 'slates';
import { spec } from './spec';
import { pollMessages, publishMessage, updateNotification } from './tools';
export let provider = Slate.create({
  spec,
  tools: [publishMessage, pollMessages, updateNotification],
  triggers: []
});
