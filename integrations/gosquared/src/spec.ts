import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gosquared',
  name: 'GoSquared',
  description:
    'Web analytics and customer engagement platform providing real-time analytics, People CRM, live chat, and ecommerce tracking.',
  metadata: {},
  config,
  auth
});
