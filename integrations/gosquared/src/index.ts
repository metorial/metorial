import { Slate } from 'slates';
import { spec } from './spec';
import {
  addChatNote,
  archiveChatConversation,
  createSmartGroup,
  deletePerson,
  getChatMessages,
  getHistoricalAnalytics,
  getPerson,
  getRealtimeAnalytics,
  getSmartGroupMembers,
  identifyUser,
  listChats,
  listSmartGroups,
  searchPeople,
  sendChatMessage,
  trackEvent,
  trackPageview,
  trackTransaction
} from './tools';
import { gosquaredEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    identifyUser,
    trackEvent,
    trackTransaction,
    trackPageview,
    searchPeople,
    getPerson,
    deletePerson,
    getRealtimeAnalytics,
    getHistoricalAnalytics,
    listChats,
    getChatMessages,
    sendChatMessage,
    addChatNote,
    archiveChatConversation,
    listSmartGroups,
    getSmartGroupMembers,
    createSmartGroup
  ],
  triggers: [gosquaredEvents]
});
