import { Slate } from 'slates';
import { spec } from './spec';
import {
  addDailyNote,
  batchActions,
  createBlock,
  createPage,
  deleteBlock,
  deletePage,
  getBlock,
  getPage,
  listPages,
  moveBlock,
  pullData,
  queryGraph,
  searchBlocks,
  updateBlock,
  updatePage
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    queryGraph,
    pullData,
    getPage,
    getBlock,
    listPages,
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
  triggers: []
});
