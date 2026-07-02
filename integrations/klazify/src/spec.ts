import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'klazify',
  name: 'Klazify',
  description:
    'Content Classification API that turns any URL, domain, IP address, or email into a complete company profile with categories, logos, social media links, tech stack, and structured business data.',
  metadata: {},
  config,
  auth
});
