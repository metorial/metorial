import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'doppler-marketing-automation',
  name: 'Doppler Marketing Automation',
  description:
    'Multi-channel marketing platform focused on email marketing with support for SMS, WhatsApp, and automation workflows. Manage subscriber lists, campaigns, custom fields, and access campaign analytics.',
  metadata: {},
  config,
  auth
});
