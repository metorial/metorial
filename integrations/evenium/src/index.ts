import { Slate } from 'slates';
import { spec } from './spec';
import {
  addParticipant,
  createEvent,
  getEvent,
  listContacts,
  listEvents,
  listParticipants,
  manageContact,
  updateParticipantStatus
} from './tools';
import { eventParticipant, inboundWebhook, newEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listEvents,
    getEvent,
    createEvent,
    listParticipants,
    addParticipant,
    listContacts,
    manageContact,
    updateParticipantStatus
  ],
  triggers: [inboundWebhook, newEvent, eventParticipant]
});
