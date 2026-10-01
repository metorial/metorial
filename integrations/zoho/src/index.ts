import { Slate } from 'slates';
import { biginTools } from './products/bigin';
import { booksTools } from './products/books';
import { crmTools } from './products/crm';
import { deskTools } from './products/desk';
import { inventoryTools } from './products/inventory';
import { invoiceTools } from './products/invoice';
import { mailTools } from './products/mail';
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
import { organizationDiscoveryTools, whoAmI } from './tools/discovery';

export let provider = Slate.create({
  spec,
  tools: [
    ...organizationDiscoveryTools,
    whoAmI,
    ...crmTools,
    ...biginTools,
    ...booksTools,
    ...inventoryTools,
    ...invoiceTools,
    ...deskTools,
    ...mailTools,

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
  triggers: []
});
