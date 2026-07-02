import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'postmark',
  name: 'Postmark',
  description:
    'Transactional and broadcast email delivery service with APIs for sending, receiving, and tracking emails.',
  metadata: {},
  config,
  auth
});
