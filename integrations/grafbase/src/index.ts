import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSubgraph,
  createBranch,
  createGraph,
  deleteBranch,
  deleteGraph,
  executeGraphQL,
  getAccount,
  getBranch,
  getGraph,
  getSchema,
  getViewer,
  listGraphs,
  listSubgraphs,
  publishSubgraph
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getViewer,
    getAccount,
    listGraphs,
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
