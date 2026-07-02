import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sslmate-cert-spotter-api',
  name: 'SSLMate Cert Spotter',
  description:
    'Certificate Transparency monitoring service that watches CT logs to detect SSL/TLS certificates issued for your domains, helping identify unauthorized certificates and potential security issues.',
  metadata: {},
  config,
  auth
});
