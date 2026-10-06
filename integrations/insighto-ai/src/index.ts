import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteConversation,
  disconnectCall,
  listAssistants,
  listContacts,
  listConversations,
  listDataSources,
  listForms,
  listWebhooks,
  listWidgets,
  makeCall,
  manageAssistant,
  manageCampaign,
  manageContact,
  manageDataSource,
  manageForm,
  manageWebhook,
  sendMessage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listAssistants,
    manageAssistant,
    listContacts,
    manageContact,
    listConversations,
    deleteConversation,
    makeCall,
    disconnectCall,
    sendMessage,
    listWidgets,
    listDataSources,
    manageDataSource,
    manageForm,
    listForms,
    manageWebhook,
    listWebhooks,
    manageCampaign
  ],
  triggers: []
});
