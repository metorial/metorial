import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lob',
  name: 'Lob',
  description:
    'Automated direct mail and address verification. Send postcards, letters, self-mailers, and checks programmatically, and verify US and international addresses.',
  metadata: {},
  config,
  auth
});
