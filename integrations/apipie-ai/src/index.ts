import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeImages,
  chatCompletion,
  createEmbeddings,
  discoverModels,
  generateImage,
  getState,
  getUsage,
  manageRag,
  textToSpeech,
  updateState,
  webSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeImages,
    chatCompletion,
    generateImage,
    textToSpeech,
    createEmbeddings,
    discoverModels,
    webSearch,
    manageRag,
    getUsage,
    getState,
    updateState
  ],
  triggers: []
});
