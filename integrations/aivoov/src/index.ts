import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import { createTranscription, generateAudio, getTranscription, listVoices } from './tools';

export let provider = Slate.create({
  spec,
  tools: [generateAudio, listVoices, createTranscription, getTranscription],
  toolCategories,
  triggers: []
});
