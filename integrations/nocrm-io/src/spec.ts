import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nocrmio',
  name: 'noCRM.io',
  description:
    'Lead management software for sales teams. Create, track, and close deals with pipelines, prospecting lists, post-sales tasks, and team collaboration.',
  metadata: {},
  config,
  auth
});
