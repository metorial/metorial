import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'listclean',
  name: 'Listclean',
  description:
    'Email verification and list cleaning service that validates email addresses through syntax checks, DNS/MX record validation, SMTP checks, and risk signal analysis.',
  metadata: {},
  config,
  auth
});
