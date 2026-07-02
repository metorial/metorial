import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gift-up',
  name: 'Gift Up!',
  description: 'Digital gift card platform for selling, managing, and redeeming gift cards.',
  metadata: {},
  config,
  auth
});
