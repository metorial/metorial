import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'brilliant-directories',
  name: 'Brilliant Directories',
  description:
    'Integration with Brilliant Directories, a platform for creating and managing online membership and business directory websites.',
  metadata: {},
  config,
  auth
});
