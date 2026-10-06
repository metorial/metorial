import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteVoice,
  generateSpeech,
  getAccount,
  getVoice,
  listVoices,
  updateVoice
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [generateSpeech, listVoices, getVoice, updateVoice, deleteVoice, getAccount],
  triggers: []
});
