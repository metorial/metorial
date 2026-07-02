import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'referralrock',
  name: 'Referral Rock',
  description: undefined,
  metadata: {},
  config,
  auth
});
