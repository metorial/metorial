import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeText,
  getAccount,
  manageClassifier,
  manageDictionary,
  manageDictionaryEntries
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeText,
    getAccount,
    manageDictionary,
    manageDictionaryEntries,
    manageClassifier
  ],
  triggers: []
});
