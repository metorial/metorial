import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rafflys',
  name: 'Rafflys',
  description:
    'Retrieve Rafflys account details, discover promotions, and read the leads collected by your campaigns.',
  metadata: {},
  config,
  auth
});
