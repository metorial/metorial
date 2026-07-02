import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'refiner',
  name: 'Refiner',
  description:
    'Customer feedback survey platform for web and mobile applications. Enables creating and deploying in-app surveys (NPS, CSAT, CES, etc.), managing user contacts and segments, and syncing survey response data with third-party tools.',
  metadata: {},
  config,
  auth
});
