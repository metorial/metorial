import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDiscussion,
  createPoll,
  getDiscussion,
  getPoll,
  listDiscussions,
  listPolls,
  manageMemberships
} from './tools';
import { inboundWebhook, newDiscussions, newPolls } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createDiscussion,
    getDiscussion,
    listDiscussions,
    createPoll,
    getPoll,
    listPolls,
    manageMemberships
  ],
  triggers: [inboundWebhook, newDiscussions, newPolls]
});
