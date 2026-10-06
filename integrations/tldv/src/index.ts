import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadRecording,
  getFileUrl,
  getHighlights,
  getMeeting,
  getNotes,
  getTranscript,
  importMeeting,
  listMeetings
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMeetings,
    getMeeting,
    getTranscript,
    getHighlights,
    getNotes,
    downloadRecording,
    importMeeting,
    getFileUrl
  ],
  triggers: []
});
