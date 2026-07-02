import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'later',
  name: 'Later',
  description:
    'Later Influence Reporting API integration for retrieving influencer campaign performance data, campaign listings, reporting groups, and instance information.',
  metadata: {},
  config,
  auth
});
