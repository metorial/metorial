import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'telnyx',
  name: 'Telnyx',
  description:
    'Cloud communications platform for programmable voice, SMS/MMS messaging, fax, phone number management, two-factor authentication, number lookup, and IoT SIM management.',
  metadata: {},
  config,
  auth
});
