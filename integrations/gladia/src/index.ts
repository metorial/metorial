import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteLiveSession,
  deleteTranscription,
  getLiveSessionResult,
  getTranscription,
  initiateLiveSession,
  listTranscriptions,
  transcribeAudio,
  uploadAudio
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    transcribeAudio,
    getTranscription,
    uploadAudio,
    deleteTranscription,
    initiateLiveSession,
    getLiveSessionResult,
    listTranscriptions,
    deleteLiveSession
  ],
  triggers: []
});
