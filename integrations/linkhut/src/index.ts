import { Slate } from 'slates';
import { spec } from './spec';
import {
  addBookmark,
  checkForUpdates,
  deleteBookmark,
  getBookmarkDates,
  getBookmarks,
  getTagSuggestions,
  listAllBookmarks,
  listRecentBookmarks,
  listTags,
  manageTag
} from './tools';
import { bookmarkUpdated, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    addBookmark,
    deleteBookmark,
    getBookmarks,
    listRecentBookmarks,
    listAllBookmarks,
    getTagSuggestions,
    listTags,
    manageTag,
    checkForUpdates,
    getBookmarkDates
  ],
  triggers: [inboundWebhook, bookmarkUpdated]
});
