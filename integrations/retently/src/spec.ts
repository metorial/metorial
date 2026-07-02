import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'retently',
  name: 'Retently',
  description:
    'Customer experience management platform for NPS, CSAT, CES, and 5-Star surveys with feedback analytics and customer management.',
  metadata: {},
  config,
  auth
});
