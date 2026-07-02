import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInsightCard,
  getCall,
  getUser,
  listCalls,
  listContacts,
  listNumbers,
  listTags,
  listUsers,
  manageCall,
  manageContact,
  manageTeam,
  manageUser,
  sendMessage,
  startCall
} from './tools';
import {
  callEvents,
  contactEvents,
  messageEvents,
  numberEvents,
  userEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCalls,
    getCall,
    manageCall,
    listUsers,
    getUser,
    manageUser,
    startCall,
    listContacts,
    manageContact,
    listNumbers,
    manageTeam,
    listTags,
    sendMessage,
    createInsightCard
  ],
  triggers: [callEvents, userEvents, contactEvents, numberEvents, messageEvents]
});
