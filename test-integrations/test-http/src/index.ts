import { Slate } from 'slates';
import { spec } from './spec';
import { request } from './tools';

export let provider = Slate.create({
  spec,
  tools: [request],
  triggers: []
});
