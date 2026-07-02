import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'savvycal',
  name: 'SavvyCal',
  description:
    'Scheduling platform with shareable scheduling links, calendar overlay, team scheduling, meeting polls, and automated workflows.',
  metadata: {},
  config,
  auth
});
