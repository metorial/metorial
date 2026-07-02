import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'engage',
  name: 'Engage',
  description:
    'Customer engagement and automation platform for managing users, tracking events, and sending transactional messages via email and SMS.',
  metadata: {},
  config,
  auth
});
