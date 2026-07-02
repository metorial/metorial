import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'logdna',
  name: 'LogDNA',
  description:
    'LogDNA (Mezmo) is a SaaS log management platform for ingesting, searching, exporting, and analyzing logs from any source.',
  metadata: {},
  config,
  auth
});
