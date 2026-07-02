import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hubspot',
  name: 'HubSpot',
  description:
    'CRM platform offering marketing, sales, customer service, and content management tools with RESTful APIs for programmatic access.',
  metadata: {},
  config,
  auth
});
