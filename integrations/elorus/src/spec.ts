import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'elorus',
  name: 'Elorus',
  description:
    'Cloud-based invoicing, expense management, and time tracking platform for freelancers and small businesses.',
  metadata: {},
  config,
  auth
});
