import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'exist',
  name: 'Exist',
  description:
    'Read personal analytics, discover attributes, write owned daily values, and retrieve correlations, insights, and averages.',
  metadata: {},
  config,
  auth
});
