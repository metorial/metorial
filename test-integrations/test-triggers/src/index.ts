import { Slate } from 'slates';
import { spec } from './spec';
import { pollTime, webhookEcho } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [],
  triggers: [webhookEcho, pollTime]
});
