import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'persona',
  name: 'Persona',
  description:
    'Identity verification and compliance platform for KYC/AML, fraud prevention, and automated identity workflows.',
  metadata: {},
  config,
  auth
});
