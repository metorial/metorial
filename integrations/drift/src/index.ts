import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createConversation,
  deleteContact,
  getBookedMeetings,
  getContact,
  getConversation,
  getConversationStats,
  getConversationTranscript,
  getTokenInfo,
  listConversations,
  listCustomAttributes,
  listPlaybooks,
  listTeams,
  listUsers,
  manageAccount,
  postTimelineEvent,
  sendMessage,
  updateContact,
  updateUserAvailability
} from './tools';
import {
  contactEvent,
  conversationEvent,
  meetingEvent,
  playbookEvent,
  userEvent
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getContact,
    createContact,
    updateContact,
    deleteContact,
    listConversations,
    getConversation,
    getConversationTranscript,
    getConversationStats,
    createConversation,
    sendMessage,
    listUsers,
    updateUserAvailability,
    manageAccount,
    postTimelineEvent,
    listCustomAttributes,
    getBookedMeetings,
    listPlaybooks,
    listTeams,
    getTokenInfo
  ],
  triggers: [conversationEvent, contactEvent, meetingEvent, userEvent, playbookEvent]
});
