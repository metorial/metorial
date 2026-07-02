import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'poof',
  name: 'Poof',
  description:
    'Payments infrastructure platform for accepting cryptocurrency payments, credit card payments, ACH bank transfers, and Cash App payments.',
  metadata: {},
  config,
  auth
});
