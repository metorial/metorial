import { Slate } from 'slates';
import { spec } from './spec';
import { checkCredits, lookupIp } from './tools';

export let provider = Slate.create({
  spec,
  tools: [lookupIp, checkCredits],
  triggers: []
});
