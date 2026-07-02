import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'leadboxer',
  name: 'LeadBoxer',
  description:
    'B2B lead generation and intelligence platform that identifies website visitors, enriches lead data with firmographic information, and scores/qualifies leads for sales teams.',
  metadata: {},
  config,
  auth
});
