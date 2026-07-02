import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBatchTranscription,
  deleteBatchTranscription,
  enrollSpeakerProfile,
  fastTranscribeAudio,
  getBatchTranscription,
  identifySpeaker,
  listBatchTranscriptions,
  listSpeechModels,
  listVoices,
  manageSpeakerProfile,
  recognizeSpeech,
  synthesizeSpeech,
  verifySpeaker
} from './tools';
import { batchTranscriptionCompleted, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    synthesizeSpeech,
    fastTranscribeAudio,
    listVoices,
    recognizeSpeech,
    createBatchTranscription,
    getBatchTranscription,
    listBatchTranscriptions,
    deleteBatchTranscription,
    listSpeechModels,
    manageSpeakerProfile,
    enrollSpeakerProfile,
    verifySpeaker,
    identifySpeaker
  ],
  triggers: [inboundWebhook, batchTranscriptionCompleted]
});
