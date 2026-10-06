import { Slate } from 'slates';
import { spec } from './spec';
import {
  createChatCompletion,
  createSpeechUnderstanding,
  createStreamingToken,
  deleteTranscript,
  getRedactedAudio,
  getSubtitles,
  getTranscript,
  getTranscriptText,
  listTranscripts,
  searchTranscript,
  submitTranscription,
  uploadMediaFile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    uploadMediaFile,
    submitTranscription,
    getTranscript,
    listTranscripts,
    deleteTranscript,
    getTranscriptText,
    getSubtitles,
    searchTranscript,
    getRedactedAudio,
    createChatCompletion,
    createSpeechUnderstanding,
    createStreamingToken
  ],
  triggers: []
});
