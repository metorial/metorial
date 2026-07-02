import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'instantly',
  name: 'Instantly',
  description:
    'Cold email outreach and sales engagement platform for managing campaigns at scale, with email warmup, B2B lead database, deliverability optimization, and unified inbox.',
  metadata: {},
  config,
  auth
});
