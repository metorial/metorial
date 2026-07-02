import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sap-successfactors',
  name: 'SAP SuccessFactors',
  description:
    'Cloud-based Human Capital Management suite covering core HR, recruiting, onboarding, performance, goals, succession, learning, compensation, and time management.',
  metadata: {},
  config,
  auth
});
