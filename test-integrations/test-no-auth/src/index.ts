import { Slate } from 'slates';
import { spec } from './spec';
import { calculate, sumNumbers } from './tools';

export let provider = Slate.create({
  spec,
  tools: [calculate, sumNumbers],
  triggers: []
});
