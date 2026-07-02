import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDailyNote,
  batchActions,
  createBlock,
  createPage,
  deleteBlock,
  deletePage,
  getPage,
  moveBlock,
  pullData,
  queryGraph,
  searchBlocks,
  updateBlock,
  updatePage
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    queryGraph,
    pullData,
    getPage,
    createPage,
    updatePage,
    deletePage,
    createBlock,
    updateBlock,
    moveBlock,
    deleteBlock,
    addDailyNote,
    searchBlocks,
    batchActions
  ],
  triggers: [inboundWebhook]
});
