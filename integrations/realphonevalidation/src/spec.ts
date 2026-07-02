import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'realphonevalidation',
  name: 'RealPhoneValidation',
  description:
    'Real-time phone number validation, DNC lookup, fraud scoring, reassigned number detection, and email verification using live telco data.',
  metadata: {},
  config,
  auth
});
