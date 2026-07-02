import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteTranscription,
  getLiveSessionResult,
  getTranscription,
  initiateLiveSession,
  transcribeAudio,
  uploadAudio
} from './tools';
import { transcriptionCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    transcribeAudio,
    getTranscription,
    uploadAudio,
    deleteTranscription,
    initiateLiveSession,
    getLiveSessionResult
  ],
  triggers: [transcriptionCompleted]
});
