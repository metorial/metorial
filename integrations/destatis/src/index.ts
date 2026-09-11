import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadCube,
  downloadTable,
  getMetadata,
  listVariableValues,
  searchCatalog
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [searchCatalog, getMetadata, listVariableValues, downloadTable, downloadCube],
  triggers: []
});
