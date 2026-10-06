import { Slate } from 'slates';
import { spec } from './spec';
import { predictGender } from './tools';

export let provider = Slate.create({
  spec,
  tools: [predictGender],
  triggers: []
});
