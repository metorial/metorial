import { Slate } from 'slates';
import { spec } from './spec';
import { searchCatalog } from './tools';

export let provider = Slate.create({
  spec,
  tools: [searchCatalog],
  triggers: []
});
