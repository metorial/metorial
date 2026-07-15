import { Slate } from 'slates';
import { spec } from './spec';
import { tools } from './tools';
import { triggers } from './triggers';

export let provider = Slate.create({
  spec,
  tools,
  triggers
});
