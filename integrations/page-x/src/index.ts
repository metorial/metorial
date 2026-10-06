import { Slate } from 'slates';
import { spec } from './spec';
import { createLead } from './tools';

export let provider = Slate.create({
  spec,
  tools: [createLead],
  triggers: []
});
