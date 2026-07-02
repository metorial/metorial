import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'helpwise',
  name: 'Helpwise',
  description:
    'Shared inbox and customer service platform that centralizes team communication across email, SMS, WhatsApp, live chat, and social media into a single dashboard.',
  metadata: {},
  config,
  auth
});
