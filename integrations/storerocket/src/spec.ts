import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'storerocket',
  name: 'StoreRocket',
  description:
    'Discover store locator projects, retrieve and update project locations, read account and user information, and check API connectivity.',
  metadata: {},
  config,
  auth
});
