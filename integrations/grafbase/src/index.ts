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

import { inboundWebhook } from './triggers/inbound-webhook';

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
  triggers: [inboundWebhook]
});
