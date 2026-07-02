import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bettercontact',
  name: 'BetterContact',
  description:
    'B2B contact enrichment platform using waterfall enrichment across 20+ data sources to find verified work email addresses and mobile phone numbers.',
  metadata: {},
  config,
  auth
});
