import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeText,
  cleanUpText,
  compareEntities,
  detectLanguage,
  listLanguages,
  lookupWord,
  semanticSimilarity,
  translateText
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeText,
    detectLanguage,
    semanticSimilarity,
    compareEntities,
    translateText,
    cleanUpText,
    listLanguages,
    lookupWord
  ],
  triggers: []
});
