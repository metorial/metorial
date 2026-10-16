import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bidsketch',
  name: 'Bidsketch',
  description:
    'Proposal management software for creating, managing, and tracking professional proposals with client records, reusable content, and saved templates.',
  metadata: {},
  config,
  auth
});
