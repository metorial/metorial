import { Slate } from 'slates';
import { spec } from './spec';
import { pollTime, webhookEcho, webhookSyncEcho } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [],
  triggers: [webhookEcho, webhookSyncEcho, pollTime]
});
