import { Slate } from 'slates';
import { spec } from './spec';
import { echo } from './tools';

export let provider = Slate.create({
  spec,
  tools: [echo],
  triggers: []
});
