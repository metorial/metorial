import { Slate } from 'slates';
import { spec } from './spec';
import { getAccountInfo, removeBackground, submitFeedback } from './tools';

export let provider = Slate.create({
  spec,
  tools: [removeBackground, getAccountInfo, submitFeedback],
  triggers: []
});
