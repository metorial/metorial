import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zixflow',
  name: 'Zixflow',
  description:
    'AI-powered CRM and multichannel messaging platform for managing contacts, sending campaigns via WhatsApp, SMS, RCS, and Email, and automating workflows.',
  metadata: {},
  config,
  auth
});
