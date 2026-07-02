import { Slate } from 'slates';
import { spec } from './spec';
import { getSource, listSources } from './tools';

export let provider = Slate.create({
  spec,
  tools: [listSources, getSource],
  triggers: []
});
