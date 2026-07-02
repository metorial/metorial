import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'productlane',
  name: 'Productlane',
  description:
    'Customer feedback and support tool integrated with Linear. Manage companies, contacts, feedback threads, portal projects, changelogs, and workspace settings.',
  metadata: {},
  config,
  auth
});
