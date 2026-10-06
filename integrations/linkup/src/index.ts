import { Slate } from 'slates';
import { spec } from './spec';
import { checkCreditBalance, fetchWebpage, webSearch } from './tools';

export let provider = Slate.create({
  spec,
  tools: [webSearch, fetchWebpage, checkCreditBalance],
  triggers: []
});
