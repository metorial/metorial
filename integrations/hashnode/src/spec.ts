import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hashnode',
  name: 'Hashnode',
  description:
    'Developer blogging platform and headless CMS. Read publication, series, comment and static-page data; manage posts and drafts through the documented GraphQL API.',
  metadata: {},
  config,
  auth
});
