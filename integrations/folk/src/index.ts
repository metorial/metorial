import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCompany,
  createDeal,
  createNote,
  createPerson,
  createReminder,
  deleteCompany,
  deleteDeal,
  deleteNote,
  deletePerson,
  deleteReminder,
  getCompany,
  getDeal,
  getPerson,
  listCompanies,
  listCustomFields,
  listDeals,
  listGroups,
  listNotes,
  listPeople,
  listReminders,
  updateCompany,
  updateDeal,
  updateNote,
  updatePerson
} from './tools';
import {
  companyEvents,
  dealEvents,
  noteEvents,
  personEvents,
  reminderEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createPerson,
    updatePerson,
    getPerson,
    listPeople,
    deletePerson,
    createCompany,
    updateCompany,
    getCompany,
    listCompanies,
    deleteCompany,
    createDeal,
    updateDeal,
    getDeal,
    listDeals,
    deleteDeal,
    createNote,
    updateNote,
    listNotes,
    deleteNote,
    createReminder,
    listReminders,
    deleteReminder,
    listGroups,
    listCustomFields
  ],
  triggers: [personEvents, companyEvents, dealEvents, noteEvents, reminderEvents]
});
