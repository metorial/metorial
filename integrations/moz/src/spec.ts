import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'moz',
  name: 'Moz',
  description:
    'SEO software providing tools for link analysis, keyword research, domain authority measurement, and backlink profiling.',
  metadata: {},
  config,
  auth
});
