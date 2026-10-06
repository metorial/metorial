import { Slate } from 'slates';
import { spec } from './spec';
import { getEvent, getParticipants, listEvents, registerParticipant } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listEvents, getEvent, registerParticipant, getParticipants],
  triggers: []
});
