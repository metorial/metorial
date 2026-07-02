import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gumroad',
  name: 'Gumroad',
  description:
    'E-commerce platform for creators to sell digital products, physical goods, and subscriptions directly to their audience.',
  metadata: {},
  config,
  auth
});
