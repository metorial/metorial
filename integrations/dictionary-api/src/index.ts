import { Slate } from 'slates';
import { spec } from './spec';
import { getPhonetics, getSynonymsAntonyms, lookUpWord } from './tools';

export let provider = Slate.create({
  spec,
  tools: [lookUpWord, getSynonymsAntonyms, getPhonetics],
  triggers: []
});
