import { Slate } from 'slates';
import { spec } from './spec';
import { getCommentTree, getItem, getUser, listStories, search } from './tools';
import { inboundWebhook, newStories, topStoriesChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getItem, getUser, listStories, search, getCommentTree],
  triggers: [inboundWebhook, newStories, topStoriesChanges]
});
