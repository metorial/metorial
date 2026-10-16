import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'knack',
  name: 'Knack',
  description:
    'Integration with Knack, a no-code platform for building custom online databases and web applications. Manage records, query data with filtering and sorting, upload files and images, discover application structure, and download record files.',
  metadata: {
    categories: ['apis-and-http-requests', 'task-and-project-management']
  },
  config,
  auth
});
