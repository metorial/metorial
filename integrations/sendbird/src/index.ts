import { Slate } from 'slates';
import { spec } from './spec';
import {
  blockUser,
  createGroupChannel,
  createOpenChannel,
  createUser,
  deleteGroupChannel,
  deleteMessage,
  deleteUser,
  getUser,
  listGroupChannels,
  listMessages,
  listOpenChannels,
  listUsers,
  manageGroupChannelMembers,
  moderateChannel,
  searchMessages,
  sendMessage,
  updateGroupChannel,
  updateUser
} from './tools';
import { chatEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createUser,
    getUser,
    updateUser,
    deleteUser,
    listUsers,
    createGroupChannel,
    updateGroupChannel,
    listGroupChannels,
    deleteGroupChannel,
    manageGroupChannelMembers,
    createOpenChannel,
    listOpenChannels,
    sendMessage,
    listMessages,
    searchMessages,
    deleteMessage,
    moderateChannel,
    blockUser
  ],
  triggers: [chatEvents]
});
