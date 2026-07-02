import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContact,
  createConversation,
  deleteContact,
  getBookedMeetings,
  getContact,
  getConversation,
  listConversations,
  listPlaybooks,
  listTeams,
  listUsers,
  manageAccount,
  sendMessage,
  updateContact
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
    createConversation,
    sendMessage,
    listUsers,
    manageAccount,
    getBookedMeetings,
    listPlaybooks,
    listTeams
  ],
  triggers: [conversationEvent, contactEvent, meetingEvent, userEvent, playbookEvent]
});
