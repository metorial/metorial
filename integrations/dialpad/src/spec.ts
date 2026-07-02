import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dialpad',
  name: 'Dialpad',
  description:
    'Cloud-based business communications platform offering voice calling, messaging, video meetings, and contact center capabilities.',
  metadata: {},
  config,
  auth
});
