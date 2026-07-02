import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twitter',
  name: 'Twitter/X',
  description:
    'Social media platform for public microblogging, direct messaging, and real-time public conversation.',
  metadata: {},
  config,
  auth
});
