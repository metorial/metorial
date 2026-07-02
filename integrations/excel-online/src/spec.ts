import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'excel-online',
  name: 'Excel Online',
  description:
    'Read and write Excel workbook data in OneDrive for Business and SharePoint via the Microsoft Graph API. Manage worksheets, cell ranges, tables, charts, named items, and invoke Excel calculation functions.',
  metadata: {},
  config,
  auth
});
