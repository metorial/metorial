import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dropcontact',
  name: 'Dropcontact',
  description:
    'B2B contact data enrichment service that finds, verifies, and qualifies professional email addresses and enriches contact and company information in real-time. GDPR-compliant with a pay-on-success credit model.',
  metadata: {},
  config,
  auth
});
