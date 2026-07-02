import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'proabono',
  name: 'ProAbono',
  description:
    'Subscription management and recurring billing platform for SaaS businesses. Automates subscription lifecycle, invoicing, payment collection, and customer portal hosting.',
  metadata: {},
  config,
  auth
});
