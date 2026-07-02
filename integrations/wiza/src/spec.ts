import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wiza',
  name: 'Wiza',
  description:
    'B2B contact enrichment and sales intelligence platform that finds verified email addresses, phone numbers, and professional details by leveraging LinkedIn data.',
  metadata: {},
  config,
  auth
});
