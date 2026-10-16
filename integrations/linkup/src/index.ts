import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkCreditBalance,
  createResearch,
  fetchWebpage,
  getResearch,
  listResearch,
  webSearch
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    webSearch,
    fetchWebpage,
    checkCreditBalance,
    createResearch,
    getResearch,
    listResearch
  ],
  triggers: []
});
