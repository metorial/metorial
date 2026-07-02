import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cabinpanda',
  name: 'CabinPanda',
  description:
    'Data collection platform for creating and managing online forms, collecting submissions, and analyzing form performance with 2,200+ app integrations.',
  metadata: {},
  config,
  auth
});
