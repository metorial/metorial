import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAlias,
  deleteAlias,
  getAlias,
  getClicks,
  listAliases,
  listClicks,
  updateAlias
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [createAlias, getAlias, updateAlias, deleteAlias, listAliases, getClicks, listClicks],
  triggers: []
});
