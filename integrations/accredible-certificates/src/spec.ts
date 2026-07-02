import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'accredible-certificates',
  name: 'Accredible Certificates',
  description:
    'Digital credentialing platform for creating, managing, and issuing digital certificates, badges, and blockchain credentials.',
  metadata: {},
  config,
  auth
});
