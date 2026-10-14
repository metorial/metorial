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
  getGroupChannel,
  getMessage,
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
  updateMessage,
  updateUser
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createUser,
    getUser,
    updateUser,
    deleteUser,
    listUsers,
    createGroupChannel,
    getGroupChannel,
    updateGroupChannel,
    listGroupChannels,
    deleteGroupChannel,
    manageGroupChannelMembers,
    createOpenChannel,
    listOpenChannels,
    sendMessage,
    getMessage,
    updateMessage,
    listMessages,
    searchMessages,
    deleteMessage,
    moderateChannel,
    blockUser
  ],
  triggers: []
});
