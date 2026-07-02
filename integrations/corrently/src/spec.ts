import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'corrently',
  name: 'Corrently',
  description:
    'Green energy platform providing renewable energy data, CO2 emissions tracking, electricity pricing, and energy schedule optimization for German locations.',
  metadata: {},
  config,
  auth
});
