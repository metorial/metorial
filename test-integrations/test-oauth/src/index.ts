import { Slate } from 'slates';
import { spec } from './spec';
import { me } from './tools';

export let provider = Slate.create({
  spec,
  tools: [me],
  triggers: []
});
