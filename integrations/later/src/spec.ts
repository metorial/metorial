import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'later',
  name: 'Later',
  description:
    'Later Influence reporting for authorized instances, campaign rosters, performance metrics and time series, with separate legacy reporting compatibility.',
  metadata: {},
  config,
  auth
});
