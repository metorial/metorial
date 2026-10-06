import { Slate } from 'slates';
import { spec } from './spec';
import {
  addComment,
  appendBlocks,
  createDatabase,
  createPage,
  deleteBlock,
  getBlockChildren,
  getDatabase,
  getPage,
  listComments,
  listUsers,
  queryDatabase,
  search,
  updateBlock,
  updateDatabase,
  updatePage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPage,
    getPage,
    updatePage,
    search,
    queryDatabase,
    getDatabase,
    createDatabase,
    updateDatabase,
    getBlockChildren,
    appendBlocks,
    updateBlock,
    deleteBlock,
    addComment,
    listComments,
    listUsers
  ],
  triggers: []
});
