import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ahrefs',
  name: 'Ahrefs',
  description:
    'SEO toolset providing programmatic access to backlink analysis, keyword research, organic traffic estimates, SERP analysis, rank tracking, site auditing, and AI brand monitoring.',
  metadata: {},
  config,
  auth
});
