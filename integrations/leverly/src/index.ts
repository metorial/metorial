import { Slate } from 'slates';
import { spec } from './spec';
import { createCall, stopReattempts } from './tools';
export let provider = Slate.create({
  spec,
  tools: [createCall, stopReattempts],
  triggers: []
});
