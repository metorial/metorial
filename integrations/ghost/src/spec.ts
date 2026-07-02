import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ghost',
  name: 'Ghost',
  description:
    'Open-source publishing platform for blogs, newsletters, memberships, and paid subscriptions.',
  metadata: {},
  config,
  auth
});
