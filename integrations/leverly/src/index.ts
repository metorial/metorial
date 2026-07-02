import { Slate } from 'slates';
import { spec } from './spec';
import { createCall, stopReattempts } from './tools';
import { callFinished } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [createCall, stopReattempts],
  triggers: [callFinished]
});
