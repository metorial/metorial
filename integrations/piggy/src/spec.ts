import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'piggy',
  name: 'Piggy',
  description:
    'Piggy (Leat) is a loyalty and rewards platform for managing customer loyalty programs, gift cards, promotions, vouchers, and CRM contacts.',
  metadata: {},
  config,
  auth
});
