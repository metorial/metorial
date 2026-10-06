import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchTranscribeAudio,
  createRecognizer,
  deleteRecognizer,
  getOperation,
  getRecognizer,
  listRecognizers,
  listVoices,
  synthesizeSpeech,
  transcribeAudio,
  updateRecognizer
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    transcribeAudio,
    batchTranscribeAudio,
    getOperation,
    createRecognizer,
    getRecognizer,
    listRecognizers,
    updateRecognizer,
    deleteRecognizer,
    synthesizeSpeech,
    listVoices
  ],
  triggers: []
});
