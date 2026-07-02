import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'signpath',
  name: 'SignPath',
  description:
    'Code signing platform for secure, policy-driven signing of software artifacts with HSM-backed key storage. Submit, manage, and track signing requests, manage projects and certificates, and enforce signing policies.',
  metadata: {},
  config,
  auth
});
