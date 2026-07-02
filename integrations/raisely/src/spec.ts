import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'raisely',
  name: 'Raisely',
  description:
    'Fundraising platform for charities and nonprofits. Accept donations, run peer-to-peer campaigns, sell event tickets, manage supporters, and handle recurring giving.',
  metadata: {},
  config,
  auth
});
