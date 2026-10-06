import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vonage',
  name: 'Vonage',
  description:
    'Send multichannel messages, create and control phone calls, start and check verifications, inspect phone numbers, manage virtual numbers and applications, and read account balance or manage subaccounts and transfers.',
  metadata: {},
  config,
  auth
});
