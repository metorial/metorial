import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'egnyte',
  name: 'Egnyte',
  description:
    'Cloud content management and governance platform for secure file storage, sharing, collaboration, and data governance.',
  metadata: {},
  config,
  auth
});
