import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'handelsregister-ai',
  name: 'Handelsregister.ai',
  description:
    'Search German companies and retrieve registry profiles, financials, ownership, people, publications, and downloadable official documents.',
  metadata: {},
  auth,
  config
});
