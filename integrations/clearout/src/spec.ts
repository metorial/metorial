import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clearout',
  name: 'Clearout',
  description:
    'Email validation, email finding, and data enrichment platform. Verify emails, discover contacts by name and domain, perform reverse lookups, and resolve domain information.',
  metadata: {},
  config,
  auth
});
