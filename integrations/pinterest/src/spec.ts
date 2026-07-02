import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pinterest',
  name: 'Pinterest',
  description:
    'Visual discovery platform for creating and managing Pins, Boards, ad campaigns, shopping catalogs, and analytics.',
  metadata: {},
  config,
  auth
});
