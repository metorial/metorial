import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'semrush',
  name: 'Semrush',
  description:
    'Online visibility management and digital marketing platform providing SEO, PPC, content marketing, competitor analysis, backlink analytics, keyword research, traffic analytics, and local listing management.',
  metadata: {},
  config,
  auth
});
