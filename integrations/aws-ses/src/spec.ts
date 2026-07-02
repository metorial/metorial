import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-ses',
  name: 'AWS SES',
  description:
    'Amazon Simple Email Service (SES) integration for sending marketing, transactional, and notification emails. Supports formatted, raw, and templated email sending, contact list management, identity verification, suppression lists, configuration sets, and deliverability insights.',
  metadata: {},
  config,
  auth
});
