import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'klazify',
  name: 'Klazify',
  description:
    'Classify URLs, domains, IP addresses, and emails into categories and available company data, retrieve logos and social profiles, inspect category taxonomies, and discover domains by company or technology filters.',
  metadata: {},
  config,
  auth
});
