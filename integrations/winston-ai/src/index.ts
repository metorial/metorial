import { Slate } from 'slates';
import { spec } from './spec';
import {
  compareTexts,
  detectAiImage,
  detectAiText,
  detectPlagiarism,
  factCheck
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    detectAiText.build(),
    detectAiImage.build(),
    detectPlagiarism.build(),
    factCheck.build(),
    compareTexts.build()
  ],
  triggers: []
});
