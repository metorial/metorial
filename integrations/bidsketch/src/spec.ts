import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bidsketch',
  name: 'Bidsketch',
  description:
    'Proposal management software for creating, sending, and tracking professional proposals with electronic signatures, client management, and reusable content.',
  metadata: {},
  config,
  auth
});
