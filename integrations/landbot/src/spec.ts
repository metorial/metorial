import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'landbot',
  name: 'Landbot',
  description:
    'No-code chatbot platform for building conversational experiences across web, WhatsApp, Messenger, and API channels.',
  metadata: {},
  config,
  auth
});
