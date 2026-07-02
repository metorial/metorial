import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'unione',
  name: 'Unione',
  description:
    'Transactional email service for sending, tracking, and managing email delivery with template support, domain verification, and real-time event webhooks.',
  metadata: {},
  config,
  auth
});
