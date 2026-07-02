import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'whatsapp-business',
  name: 'WhatsApp Business',
  description:
    'Send and receive WhatsApp messages at scale, manage templates, media, business profiles, and phone numbers via the WhatsApp Business Cloud API.',
  metadata: {},
  config,
  auth
});
