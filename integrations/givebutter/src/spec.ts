import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'givebutter',
  name: 'Givebutter',
  description:
    'Givebutter is a fundraising platform for nonprofits providing donation forms, campaigns, events, ticketing, auctions, and donor/contact management (CRM).',
  metadata: {},
  config,
  auth
});
