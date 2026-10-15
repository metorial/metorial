import { toolCategory } from 'slates';
import { biginTools } from './products/bigin';
import { booksTools } from './products/books';
import { crmTools } from './products/crm';
import { deskTools } from './products/desk';
import { inventoryTools } from './products/inventory';
import { invoiceTools } from './products/invoice';
import { mailTools } from './products/mail';
import {
  booksLegacyTools,
  crmLegacyTools,
  deskLegacyTools,
  peopleTools,
  projectsTools
} from './tools';
import { organizationDiscoveryTools } from './tools/discovery';

export let toolCategories = [
  toolCategory({
    key: 'crm',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-crm.svg',
    name: 'Zoho CRM',
    description:
      'Records, modules, COQL queries, notes, attachments, tags, users, and emails in Zoho CRM.',
    tools: [...crmTools, ...crmLegacyTools]
  }),
  toolCategory({
    key: 'bigin',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-bigin.svg',
    name: 'Zoho Bigin',
    description: 'Records, modules, layouts, views, tags, notes, and users in Zoho Bigin.',
    tools: biginTools
  }),
  toolCategory({
    key: 'books',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-books.svg',
    name: 'Zoho Books',
    description:
      'Invoices, estimates, contacts, bills, expenses, payments, banking, projects, and accounting in Zoho Books.',
    tools: [...booksTools, ...booksLegacyTools, organizationDiscoveryTools.books]
  }),
  toolCategory({
    key: 'inventory',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-inventory.svg',
    name: 'Zoho Inventory',
    description:
      'Items, warehouses, sales and purchase orders, shipments, invoices, bills, and stock adjustments in Zoho Inventory.',
    tools: [...inventoryTools, organizationDiscoveryTools.inventory]
  }),
  toolCategory({
    key: 'invoice',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-invoice.svg',
    name: 'Zoho Invoice',
    description:
      'Invoices, recurring invoices, estimates, contacts, payments, expenses, projects, and time entries in Zoho Invoice.',
    tools: [...invoiceTools, organizationDiscoveryTools.invoice]
  }),
  toolCategory({
    key: 'desk',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-desk.svg',
    name: 'Zoho Desk',
    description:
      'Tickets, contacts, accounts, agents, tasks, articles, and time entries in Zoho Desk.',
    tools: [...deskTools, ...deskLegacyTools, organizationDiscoveryTools.desk]
  }),
  toolCategory({
    key: 'mail',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-mail.svg',
    name: 'Zoho Mail',
    description:
      'Emails, folders, labels, notes, tasks, bookmarks, and account settings in Zoho Mail.',
    tools: mailTools
  }),
  toolCategory({
    key: 'projects',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-projects.svg',
    name: 'Zoho Projects',
    description: 'Portals, projects, and tasks in Zoho Projects.',
    tools: projectsTools
  }),
  toolCategory({
    key: 'people',
    imageUrl: 'https://provider-logos.metorial-cdn.com/zoho-people.svg',
    name: 'Zoho People',
    description: 'Employee records in Zoho People.',
    tools: peopleTools
  })
];
