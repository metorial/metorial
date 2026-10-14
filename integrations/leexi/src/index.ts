import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCall,
  createMeetingEvent,
  deleteMeetingEvent,
  getCall,
  getCallNote,
  getMeetingEvent,
  getPresignedUrl,
  launchMeetingAssistant,
  listCallNotes,
  listCalls,
  listMeetingEvents,
  listTeams,
  listUsers,
  updateCallNote
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    listTeams,
    listCalls,
    getCall,
    createCall,
    getPresignedUrl,
    listMeetingEvents,
    getMeetingEvent,
    createMeetingEvent,
    deleteMeetingEvent,
    launchMeetingAssistant,
    listCallNotes,
    getCallNote,
    updateCallNote
  ],
  triggers: []
});
