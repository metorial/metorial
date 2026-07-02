import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'paradym',
  name: 'Paradym',
  description:
    'Digital identity platform for issuing, verifying, and managing verifiable credentials using SD-JWT VC, mDOC, and AnonCreds formats over OpenID4VC and DIDComm protocols.',
  metadata: {},
  config,
  auth
});
