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
import { responseEvent } from './triggers';

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
  triggers: [responseEvent]
});
