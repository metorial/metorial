import { Slate } from 'slates';
import { spec } from './spec';
import {
  getConversationHistory,
  getConversationInfo,
  getTeamInfo,
  getUserInfo,
  listConversations,
  manageBookmarks,
  manageChannel,
  manageChannelMembers,
  manageFiles,
  managePins,
  manageReactions,
  manageReminders,
  manageScheduledMessages,
  manageUserGroups,
  manageUserStatus,
  openConversation,
  scheduleMessage,
  searchFiles,
  searchMessages,
  sendMessage,
  updateMessage
} from './tools';
import {
  channelActivity,
  newFile,
  newMessage,
  newMessageWebhook,
  newReaction,
  userChange
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    updateMessage,
    scheduleMessage,
    manageScheduledMessages,
    getConversationHistory,
    getConversationInfo,
    openConversation,
    listConversations,
    manageChannel,
    manageChannelMembers,
    getUserInfo,
    manageUserStatus,
    manageReactions,
    managePins,
    manageFiles,
    searchMessages,
    searchFiles,
    manageReminders,
    manageUserGroups,
    manageBookmarks,
    getTeamInfo
  ],
  triggers: [newMessage, newMessageWebhook, channelActivity, newReaction, newFile, userChange]
});
