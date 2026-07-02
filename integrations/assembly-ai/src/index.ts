import { Slate } from 'slates';
import { spec } from './spec';
import {
  createStreamingToken,
  deleteTranscript,
  getRedactedAudio,
  getSubtitles,
  getTranscript,
  getTranscriptText,
  lemurTask,
  listTranscripts,
  searchTranscript,
  submitTranscription
} from './tools';
import { inboundWebhook, transcriptionCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    submitTranscription,
    getTranscript,
    listTranscripts,
    deleteTranscript,
    getTranscriptText,
    getSubtitles,
    searchTranscript,
    getRedactedAudio,
    lemurTask,
    createStreamingToken
  ],
  triggers: [inboundWebhook, transcriptionCompleted]
});
