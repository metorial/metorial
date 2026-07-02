import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'datascope',
  name: 'Datascope',
  description:
    'Mobile forms and data collection platform for field operations. Create digital checklists, work orders, and forms, collect data offline via mobile, and integrate submissions with external systems.',
  metadata: {},
  config,
  auth
});
