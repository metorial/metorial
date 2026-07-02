import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'paystack',
  name: 'Paystack',
  description:
    'Payment processing platform for African businesses, enabling merchants to accept payments online and in-person via cards, bank transfers, USSD, mobile money, and other channels.',
  metadata: {},
  config,
  auth
});
