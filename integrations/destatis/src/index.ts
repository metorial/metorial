import { Slate } from 'slates';
import { spec } from './spec';

export let provider = Slate.create({
  spec,
  tools: [],
  triggers: []
});
