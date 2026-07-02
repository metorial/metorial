import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'phantombuster',
  name: 'PhantomBuster',
  description:
    'Cloud-based automation platform for data extraction, lead generation, and social media automation. Manage Phantoms, launch automations, monitor executions, and work with the LinkedIn Leads database.',
  metadata: {},
  config,
  auth
});
