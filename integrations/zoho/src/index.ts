import { Slate } from 'slates';
import { spec } from './spec';
import {
  booksGetInvoices,
  booksManageContact,
  booksManageExpense,
  booksManageInvoice,
  crmGetModules,
  crmGetRecords,
  crmGetRelatedRecords,
  crmManageRecord,
  crmSearchRecords,
  deskGetTickets,
  deskManageContact,
  deskManageTicket,
  peopleManageEmployee,
  projectsGetPortals,
  projectsManageProject,
  projectsManageTask
} from './tools';
import { crmRecordEvents, deskEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    crmGetRecords,
    crmManageRecord,
    crmSearchRecords,
    crmGetModules,
    crmGetRelatedRecords,
    deskGetTickets,
    deskManageTicket,
    deskManageContact,
    booksGetInvoices,
    booksManageInvoice,
    booksManageContact,
    booksManageExpense,
    peopleManageEmployee,
    projectsGetPortals,
    projectsManageProject,
    projectsManageTask
  ],
  triggers: [crmRecordEvents, deskEvents]
});
