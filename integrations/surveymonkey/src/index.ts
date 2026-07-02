import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCollector,
  createContact,
  createContactList,
  createContactsBulk,
  createSurvey,
  deleteCollector,
  deleteContactList,
  deleteSurvey,
  getResponse,
  getResponses,
  getSurvey,
  getUser,
  listCollectors,
  listContactLists,
  listContacts,
  listSurveys,
  sendInvitation,
  updateCollector,
  updateSurvey
} from './tools';
import { responseEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSurveys,
    getSurvey,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    createCollector,
    updateCollector,
    listCollectors,
    deleteCollector,
    getResponses,
    getResponse,
    listContactLists,
    createContactList,
    listContacts,
    createContact,
    createContactsBulk,
    deleteContactList,
    sendInvitation,
    getUser
  ],
  triggers: [responseEvent]
});
