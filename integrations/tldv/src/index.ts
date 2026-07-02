import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadRecording,
  getHighlights,
  getMeeting,
  getTranscript,
  importMeeting,
  listMeetings
} from './tools';
import { meetingReady, transcriptReady } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listMeetings,
    getMeeting,
    getTranscript,
    getHighlights,
    downloadRecording,
    importMeeting
  ],
  triggers: [meetingReady, transcriptReady]
});
