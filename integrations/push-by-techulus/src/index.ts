import { Slate } from 'slates';
import { spec } from './spec';
import {
  inviteTeamMember,
  removeTeamMember,
  sendGroupNotification,
  sendNotification
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [sendNotification, sendGroupNotification, inviteTeamMember, removeTeamMember],
  triggers: [inboundWebhook]
});
