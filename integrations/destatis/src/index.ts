import { Slate } from 'slates';
import { spec } from './spec';
import { getMetadata, listVariableValues, searchCatalog } from './tools';

export let provider = Slate.create({
  spec,
  tools: [searchCatalog, getMetadata, listVariableValues],
  triggers: []
});
