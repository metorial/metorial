import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'moosend',
  name: 'Moosend',
  description:
    'Email marketing and automation platform for creating campaigns, managing mailing lists and subscribers, building segments, and sending transactional emails.',
  metadata: {},
  config,
  auth
});
