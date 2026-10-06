import { Slate } from 'slates';
import { spec } from './spec';
import { generateAudio, listVoices } from './tools';

export let provider = Slate.create({
  spec,
  tools: [generateAudio, listVoices],
  triggers: []
});
