import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-oauth',
  name: 'Test (OAuth)',
  description:
    'Internal test slate that runs the OAuth 2.0 authorization code flow against the Metorial mock OAuth provider at https://mock-oauth.metorial.net. Exposes one auth method per failure stage plus a happy-path method so callers can trigger deterministic OAuth errors on demand.',
  metadata: {},
  config,
  auth
});
