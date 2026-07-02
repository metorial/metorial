import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'campaign-cleaner',
  name: 'Campaign Cleaner',
  description:
    'Analyze, clean, and optimize HTML email campaigns to improve deliverability, avoid spam filters, and ensure cross-client compatibility.',
  metadata: {},
  config,
  auth
});
