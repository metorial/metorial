import { Slate } from 'slates';
import { spec } from './spec';
import { checkUsage, detectGender, detectGenderBulk, validatePhone } from './tools';

export let provider = Slate.create({
  spec,
  tools: [detectGender, detectGenderBulk, validatePhone, checkUsage],
  triggers: []
});
