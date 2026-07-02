import { Slate } from 'slates';
import { spec } from './spec';
import { getTables, queryTable } from './tools';

export let provider = Slate.create({
  spec,
  tools: [getTables, queryTable],
  triggers: []
});
