import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEventContent,
  inviteAttendees,
  listParticipants,
  listRegistrations
} from './tools';
import { inboundWebhook, newParticipant, newRegistration } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getEventContent, listParticipants, listRegistrations, inviteAttendees],
  triggers: [inboundWebhook, newParticipant, newRegistration]
});
