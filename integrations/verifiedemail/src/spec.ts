import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'verifiedemail',
  name: 'VerifiedEmail',
  description:
    'Real-time email verification and bulk email list cleaning service. Verify individual emails, clean bulk lists, and maintain ongoing list hygiene via API and webhooks.',
  metadata: {},
  config,
  auth
});
