import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-books',
  name: 'Zoho Books',
  description:
    'Cloud-based accounting software for small and medium businesses providing invoicing, expense tracking, inventory management, project accounting, banking, and financial reporting.',
  metadata: {},
  config,
  auth
});
