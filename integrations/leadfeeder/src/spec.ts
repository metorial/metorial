import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'leadfeeder',
  name: 'Leadfeeder',
  description:
    'B2B website visitor identification tool that tracks which companies visit your website, providing company-level data, visit behavior, and IP-to-company enrichment.',
  metadata: {},
  config,
  auth
});
