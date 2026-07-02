import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'beamer',
  name: 'Beamer',
  description:
    'Beamer is a customer communication platform for SaaS products providing changelog, in-app notifications, NPS surveys, and feature request management.',
  metadata: {},
  config,
  auth
});
