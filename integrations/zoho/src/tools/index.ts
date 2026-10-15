import { booksGetInvoices } from './books-get-invoices';
import { booksManageContact } from './books-manage-contact';
import { booksManageExpense } from './books-manage-expense';
import { booksManageInvoice } from './books-manage-invoice';
import { crmGetModules } from './crm-get-modules';
import { crmGetRecords } from './crm-get-records';
import { crmGetRelatedRecords } from './crm-get-related-records';
import { crmManageRecord } from './crm-manage-record';
import { crmSearchRecords } from './crm-search-records';
import { deskGetTickets } from './desk-get-tickets';
import { deskManageContact } from './desk-manage-contact';
import { deskManageTicket } from './desk-manage-ticket';
import { peopleManageEmployee } from './people-manage-employee';
import { projectsGetPortals } from './projects-get-portals';
import { projectsManageProject } from './projects-manage-project';
import { projectsManageTask } from './projects-manage-task';

export {
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
};

export let crmLegacyTools = [
  crmGetRecords,
  crmManageRecord,
  crmSearchRecords,
  crmGetModules,
  crmGetRelatedRecords
];
export let deskLegacyTools = [deskGetTickets, deskManageTicket, deskManageContact];
export let booksLegacyTools = [
  booksGetInvoices,
  booksManageInvoice,
  booksManageContact,
  booksManageExpense
];
export let peopleTools = [peopleManageEmployee];
export let projectsTools = [projectsGetPortals, projectsManageProject, projectsManageTask];
