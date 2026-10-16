import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'uniqode',
  name: 'Uniqode',
  description:
    'Manage Uniqode QR codes, digital business cards, campaigns, and scan analytics.',
  metadata: {},
  config,
  auth
});
