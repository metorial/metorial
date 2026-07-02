import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'teltel',
  name: 'TelTel',
  description:
    'Cloud-based telephony platform for voice calls, SMS messaging, auto dialer campaigns, and number verification.',
  metadata: {},
  config,
  auth
});
