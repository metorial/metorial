import { Slate } from 'slates';
import { spec } from './spec';
import {
  addParticipant,
  createEvent,
  getEvent,
  getParticipant,
  listContactEvents,
  listContacts,
  listEventParts,
  listEvents,
  listParticipants,
  manageContact,
  updateParticipant,
  updateParticipantStatus
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listEvents,
    getEvent,
    getParticipant,
    updateParticipant,
    listContactEvents,
    listEventParts,
    createEvent,
    listParticipants,
    addParticipant,
    listContacts,
    manageContact,
    updateParticipantStatus
  ],
  triggers: []
});
