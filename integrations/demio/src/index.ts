import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkConnection,
  getEvent,
  getEventSession,
  getParticipants,
  listEvents,
  registerParticipant
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listEvents,
    getEvent,
    registerParticipant,
    getParticipants,
    checkConnection,
    getEventSession
  ],
  triggers: []
});
