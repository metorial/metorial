import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-desk',
  name: 'Zoho Desk',
  description:
    'Cloud-based customer service and help desk platform providing multi-channel ticket management, knowledge base, agent management, workflow automation, and reporting for customer support operations.',
  metadata: {},
  config,
  auth
});
