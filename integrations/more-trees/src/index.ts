import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getCarbonOffset,
  getCreditBalance,
  getForestInfo,
  listProjects,
  plantTrees
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountInfo,
    getForestInfo,
    listProjects,
    plantTrees,
    getCreditBalance,
    getCarbonOffset
  ],
  triggers: []
});
