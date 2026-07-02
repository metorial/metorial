import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dbt-cloud',
  name: 'dbt Cloud',
  description:
    'Managed platform for dbt that enables data teams to transform data in their warehouse. Provides job scheduling, CI/CD, an integrated development environment, project metadata and discovery APIs, and a semantic layer for defining and querying business metrics.',
  metadata: {},
  config,
  auth
});
