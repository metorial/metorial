import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeImageForensics,
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
    compareTexts.build(),
    analyzeImageForensics.build()
  ],
  triggers: []
});
