import { Slate } from 'slates';
import { spec } from './spec';
import { batchCheck, checkCredits, checkNumber } from './tools';
export let provider = Slate.create({
  spec,
  tools: [checkNumber, batchCheck, checkCredits],
  triggers: []
});
