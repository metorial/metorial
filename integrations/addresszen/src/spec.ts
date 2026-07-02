import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'addresszen',
  name: 'AddressZen',
  description:
    'Address verification, autocomplete, email validation, and phone validation platform providing US and international address lookup verified by trusted postal sources.',
  metadata: {},
  config,
  auth
});
