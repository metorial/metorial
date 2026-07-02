import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cardly',
  name: 'Cardly',
  description:
    'Send personalized, handwritten greeting cards, postcards, and letters at scale. Manage artwork, templates, contacts, orders, and webhooks through the Cardly API.',
  metadata: {},
  config,
  auth
});
