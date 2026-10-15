import { Slate } from 'slates';
import { toolCategories } from './categories';
import { biginTools } from './products/bigin';
import { booksTools } from './products/books';
import { crmTools } from './products/crm';
import { deskTools } from './products/desk';
import { inventoryTools } from './products/inventory';
import { invoiceTools } from './products/invoice';
import { mailTools } from './products/mail';
import { spec } from './spec';
import {
  booksLegacyTools,
  crmLegacyTools,
  deskLegacyTools,
  peopleTools,
  projectsTools
} from './tools';
import { organizationDiscoveryTools, whoAmI } from './tools/discovery';

export let provider = Slate.create({
  spec,
  tools: [
    ...Object.values(organizationDiscoveryTools),
    whoAmI,
    ...crmTools,
    ...biginTools,
    ...booksTools,
    ...inventoryTools,
    ...invoiceTools,
    ...deskTools,
    ...mailTools,
    ...crmLegacyTools,
    ...deskLegacyTools,
    ...booksLegacyTools,
    ...peopleTools,
    ...projectsTools
  ],
  triggers: [],
  toolCategories
});
