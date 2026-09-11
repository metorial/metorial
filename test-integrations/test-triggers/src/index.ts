import { Slate } from 'slates';
import { spec } from './spec';
import { whoami } from './tools';
import {
  autoWebhookCreated,
  autoWebhookEcho,
  autoWebhookGroup,
  manualWebhookEcho,
  manualWebhookGroup,
  pollEventsGroup,
  pollStatus,
  pollTime
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [whoami],
  triggerGroups: [pollEventsGroup, autoWebhookGroup, manualWebhookGroup],
  triggers: [pollTime, pollStatus, autoWebhookEcho, autoWebhookCreated, manualWebhookEcho]
});
