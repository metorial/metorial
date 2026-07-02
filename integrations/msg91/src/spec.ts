import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'msg91',
  name: 'MSG91',
  description:
    'CPaaS platform for multi-channel communications across SMS, Email, WhatsApp, Voice, and RCS with OTP verification, contact management, and campaign automation.',
  metadata: {},
  config,
  auth
});
