import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'emaillistverify',
  name: 'EmailListVerify',
  description:
    'Email verification and validation service that checks whether email addresses are valid, deliverable, and safe to send to. Offers single and bulk verification, email finding, domain search, and email enrichment.',
  metadata: {},
  config,
  auth
});
