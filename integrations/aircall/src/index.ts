import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInsightCard,
  downloadCallMedia,
  getCall,
  getCompany,
  getContact,
  getFileUrl,
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
    createInsightCard,
    getCompany,
    getContact,
    downloadCallMedia,
    getFileUrl
  ],
  triggers: []
});
