import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'suitedash',
  name: 'SuiteDash',
  description:
    'All-in-one business management platform with CRM, client portal, project management, invoicing, and marketing.',
  metadata: {},
  config,
  auth
});
