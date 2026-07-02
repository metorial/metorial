import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'digicert',
  name: 'DigiCert',
  description:
    'Certificate authority providing TLS/SSL certificate ordering, lifecycle management, domain validation, and organization management through the CertCentral platform.',
  metadata: {},
  config,
  auth
});
