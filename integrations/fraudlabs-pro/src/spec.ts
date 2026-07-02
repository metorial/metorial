import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fraudlabs-pro',
  name: 'FraudLabs Pro',
  description:
    'Fraud prevention solution that screens online transactions for payment fraud using IP geolocation, email validation, credit card verification, blacklist checks, and SMS-based OTP verification.',
  metadata: {},
  config,
  auth
});
