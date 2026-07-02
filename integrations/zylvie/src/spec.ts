import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zylvie',
  name: 'Zylvie',
  description:
    'Checkout and digital commerce platform for creators, coaches, and small businesses to sell digital products and subscriptions with zero commission fees.',
  metadata: {},
  config,
  auth
});
