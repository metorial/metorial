import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'resistant-ai',
  name: 'Resistant AI',
  description:
    'KYC identity verification platform by StackGo that verifies individuals using government-issued identity documents and biometric selfies, with AML screening, proof of address, background checks, credit checks, and KYB reports.',
  metadata: {},
  config,
  auth
});
