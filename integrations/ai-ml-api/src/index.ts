import { Slate } from 'slates';
import { spec } from './spec';
import {
  chatCompletion,
  generateEmbeddings,
  generateImage,
  generateVideo,
  listModels,
  moderateContent,
  speechToText,
  textToSpeech
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    chatCompletion,
    generateImage,
    textToSpeech,
    speechToText,
    generateEmbeddings,
    moderateContent,
    generateVideo,
    listModels
  ],
  triggers: []
});
