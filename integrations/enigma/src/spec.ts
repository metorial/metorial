import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'enigma',
  name: 'Enigma',
  description:
    'Data intelligence platform providing comprehensive U.S. business data including identity, activity, relationships, KYB verification, and compliance screening.',
  metadata: {},
  config,
  auth
});
