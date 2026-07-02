import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'supportbee',
  name: 'SupportBee',
  description:
    'SupportBee support ticket system for organizing, prioritizing and collaborating on customer support emails.',
  metadata: {},
  config,
  auth
});
