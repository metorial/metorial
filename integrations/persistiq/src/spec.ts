import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'persistiq',
  name: 'Persistiq',
  description:
    'PersistIQ is a sales engagement platform that automates outbound sales processes including personalized email campaigns, multi-channel outreach sequences, follow-up automation, and lead management.',
  metadata: {},
  config,
  auth
});
