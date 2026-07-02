import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hashnode',
  name: 'Hashnode',
  description:
    'Developer blogging platform and headless CMS. Manage blog posts, drafts, publications, series, comments, and static pages through a GraphQL API.',
  metadata: {},
  config,
  auth
});
