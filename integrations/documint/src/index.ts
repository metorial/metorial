import { Slate } from 'slates';
import { spec } from './spec';
import { createDocument, listTemplates } from './tools';

export let provider = Slate.create({
  spec,
  tools: [listTemplates, createDocument],
  triggers: []
});
