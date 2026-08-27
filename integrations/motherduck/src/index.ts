import { Slate } from 'slates';
import { spec } from './spec';
import { motherDuckTools } from './tools';

export let provider = Slate.create({
  spec,
  tools: motherDuckTools,
  triggers: []
});
