import { Slate } from 'slates';
import { spec } from './spec';
import { tools } from './tools/registry';
export let provider = Slate.create({
  spec,
  tools,
  triggers: []
});
