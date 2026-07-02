import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appsmith',
  name: 'Appsmith',
  description:
    'Open-source low-code platform for building internal tools, admin panels, dashboards, and workflows. Supports connecting to 25+ databases and any REST/GraphQL API with drag-and-drop UI building and JavaScript-based business logic.',
  metadata: {},
  config,
  auth
});
