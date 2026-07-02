import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wati',
  name: 'Wati',
  description:
    'WhatsApp Business API platform for sending messages, managing contacts, running campaigns, and automating customer communication.',
  metadata: {},
  config,
  auth
});
