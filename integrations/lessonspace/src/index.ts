import { Slate } from 'slates';
import { spec } from './spec';
import {
  getRecording,
  getSession,
  getTranscript,
  launchSpace,
  listSessions,
  listSpaces,
  listUsers,
  removeUser,
  updateSession
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    launchSpace,
    listSessions,
    getSession,
    updateSession,
    getRecording,
    getTranscript,
    listSpaces,
    listUsers,
    removeUser
  ],
  triggers: []
});
