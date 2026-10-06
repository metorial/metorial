import { Slate } from 'slates';
import { spec } from './spec';
import { getBalance, sendLetter, sendPostcard } from './tools';

export let provider = Slate.create({
  spec,
  tools: [sendLetter, sendPostcard, getBalance],
  triggers: []
});
