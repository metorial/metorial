import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'postman',
  name: 'Postman',
  description:
    'API development platform for designing, building, testing, and monitoring APIs. Manage collections, environments, mock servers, monitors, workspaces, and team collaboration.',
  metadata: {},
  config,
  auth
});
