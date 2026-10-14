import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'verifiedemail',
  name: 'VerifiedEmail',
  description:
    'Real-time email verification and bulk email list cleaning service. Verify individual emails, manage bulk lists, monitor verification progress, and download results.',
  metadata: {},
  config,
  auth
});
