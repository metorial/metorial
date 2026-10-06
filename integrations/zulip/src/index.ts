import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveChannel,
  createChannel,
  deleteMessage,
  getChannelTopics,
  getMessages,
  getUser,
  getUserPresence,
  listChannels,
  listUsers,
  manageMessageFlags,
  manageReactions,
  manageSubscriptions,
  manageUserGroups,
  sendInvitation,
  sendMessage,
  setUserStatus,
  updateChannel,
  updateMessage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    getMessages,
    updateMessage,
    deleteMessage,
    manageReactions,
    manageMessageFlags,
    listChannels,
    createChannel,
    updateChannel,
    archiveChannel,
    getChannelTopics,
    manageSubscriptions,
    listUsers,
    getUser,
    setUserStatus,
    getUserPresence,
    manageUserGroups,
    sendInvitation
  ],
  triggers: []
});
