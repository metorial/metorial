import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComment,
  createDiscussion,
  createPoll,
  getDiscussion,
  getPoll,
  listDiscussions,
  listGroups,
  listPolls,
  manageMemberships,
  updateDiscussion
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createComment,
    createDiscussion,
    getDiscussion,
    listDiscussions,
    listGroups,
    createPoll,
    getPoll,
    listPolls,
    manageMemberships,
    updateDiscussion
  ],
  triggers: []
});
