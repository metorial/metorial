import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'anonyflow',
  name: 'Anonyflow',
  description:
    'Encryption-based data anonymization and deanonymization service for PII protection. Supports GDPR, CCPA, and HIPAA compliance with managed encryption keys.',
  metadata: {},
  config,
  auth
});
