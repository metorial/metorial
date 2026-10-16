import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCommentTree,
  getItem,
  getMaxItemId,
  getUpdates,
  getUser,
  listStories,
  search
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [getItem, getUser, listStories, search, getCommentTree, getUpdates, getMaxItemId],
  triggers: []
});
