import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSubgraph,
  createBranch,
  createGraph,
  deleteBranch,
  deleteGraph,
  executeGraphQL,
  getBranch,
  getGraph,
  getSchema,
  getViewer,
  listSubgraphs,
  publishSubgraph
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getViewer,
    createGraph,
    getGraph,
    deleteGraph,
    createBranch,
    getBranch,
    deleteBranch,
    publishSubgraph,
    checkSubgraph,
    listSubgraphs,
    getSchema,
    executeGraphQL
  ],
  triggers: []
});
