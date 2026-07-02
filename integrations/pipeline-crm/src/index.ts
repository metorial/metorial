import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCalendarEntry,
  createCompany,
  createDeal,
  createNote,
  createPerson,
  deleteCompany,
  deleteDeal,
  deletePerson,
  getCompany,
  getDeal,
  getPerson,
  listCalendarEntries,
  listCompanies,
  listCustomFieldLabels,
  listDealStages,
  listDeals,
  listNotes,
  listPeople,
  listUsers,
  updateCompany,
  updateDeal,
  updatePerson
} from './tools';
import { companyChanges, dealChanges, inboundWebhook, personChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createDeal,
    getDeal,
    listDeals,
    updateDeal,
    deleteDeal,
    createPerson,
    getPerson,
    listPeople,
    updatePerson,
    deletePerson,
    createCompany,
    getCompany,
    listCompanies,
    updateCompany,
    deleteCompany,
    createNote,
    listNotes,
    createCalendarEntry,
    listCalendarEntries,
    listUsers,
    listDealStages,
    listCustomFieldLabels
  ],
  triggers: [inboundWebhook, dealChanges, personChanges, companyChanges]
});
