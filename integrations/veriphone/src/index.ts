import { Slate } from 'slates';
import { spec } from './spec';
import { generateExamplePhone, verifyPhone } from './tools';

export let provider = Slate.create({
  spec,
  tools: [verifyPhone, generateExamplePhone],
  triggers: []
});
