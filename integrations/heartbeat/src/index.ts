import { Slate } from 'slates';
import { spec } from './spec';
import {
  createChannel,
  createComment,
  createEvent,
  createMember,
  createThread,
  deactivateMember,
  findUser,
  getRecentPosts,
  listChannels,
  listGroups,
  listMembers,
  manageGroup,
  sendDirectMessage,
  sendInvitation,
  updateMember
} from './tools';
import { communityEvents, newPosts } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createMember,
    updateMember,
    findUser,
    listMembers,
    deactivateMember,
    manageGroup,
    listGroups,
    createThread,
    createComment,
    createChannel,
    listChannels,
    createEvent,
    sendDirectMessage,
    sendInvitation,
    getRecentPosts
  ],
  triggers: [communityEvents, newPosts]
});
