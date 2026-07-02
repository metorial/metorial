import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'acculynx',
  name: 'Acculynx',
  description:
    'All-in-one business management and CRM platform for roofing contractors, covering sales, production, finance, and operations.',
  metadata: {},
  config,
  auth
});
