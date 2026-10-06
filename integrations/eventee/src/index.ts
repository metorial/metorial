import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEventContent,
  inviteAttendees,
  listParticipants,
  listRegistrations
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [getEventContent, listParticipants, listRegistrations, inviteAttendees],
  triggers: []
});
