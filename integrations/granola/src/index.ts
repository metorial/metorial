import { Slate } from 'slates';
import { spec } from './spec';
import { tools } from './tools';

export let provider = Slate.create({
  spec,
  tools,
  triggers: []
});
