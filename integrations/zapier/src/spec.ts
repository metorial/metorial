import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zapier',
  name: 'Zapier',
  description:
    'Zapier is a no-code automation platform that connects thousands of cloud applications through automated workflows called Zaps. Manage Zaps, browse apps, handle authentications, and monitor workflow execution.',
  metadata: {},
  config,
  auth
});
