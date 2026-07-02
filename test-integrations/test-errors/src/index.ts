import { Slate } from 'slates';
import { spec } from './spec';
import { throwError } from './tools';

export let provider = Slate.create({
  spec,
  tools: [throwError],
  triggers: []
});
