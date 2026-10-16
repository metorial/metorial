import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelCard,
  createContact,
  createGroup,
  deleteContact,
  deleteGroup,
  getCard,
  getContact,
  getCredits,
  getGroup,
  getTemplate,
  listCards,
  listContacts,
  listGroups,
  listTemplates,
  sendPostcard,
  updateContact,
  updateGroup,
  whoAmI
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    sendPostcard,
    listTemplates,
    listContacts,
    createContact,
    whoAmI,
    getCredits,
    getContact,
    updateContact,
    deleteContact,
    listGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    getTemplate,
    listCards,
    getCard,
    cancelCard
  ],
  triggers: []
});
