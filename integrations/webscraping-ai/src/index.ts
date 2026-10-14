import { Slate } from 'slates';
import { spec } from './spec';
import {
  askQuestion,
  extractFields,
  extractText,
  getAccountInfo,
  getStructuredData,
  scrapeHtml,
  searchGoogle,
  selectElements
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    scrapeHtml,
    extractText,
    askQuestion,
    extractFields,
    selectElements,
    getAccountInfo,
    searchGoogle,
    getStructuredData
  ],
  triggers: []
});
