import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAction,
  createContact,
  createDeal,
  createNote,
  deleteAction,
  deleteContact,
  deleteDeal,
  getActionStream,
  getContact,
  listActions,
  listCompanies,
  listContacts,
  listDeals,
  listNotes,
  listStatusesAndSources,
  logCall,
  logMeeting,
  updateAction,
  updateCompany,
  updateContact,
  updateDeal,
  updateNote
} from './tools';
import { actionEvents, contactEvents, dealEvents, noteEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    updateContact,
    getContact,
    listContacts,
    deleteContact,
    createDeal,
    updateDeal,
    listDeals,
    deleteDeal,
    createAction,
    updateAction,
    listActions,
    deleteAction,
    createNote,
    updateNote,
    listNotes,
    logCall,
    logMeeting,
    listCompanies,
    updateCompany,
    getActionStream,
    listStatusesAndSources
  ],
  triggers: [contactEvents, actionEvents, dealEvents, noteEvents]
});
