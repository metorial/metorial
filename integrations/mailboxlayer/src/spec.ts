import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailboxlayer',
  name: 'Mailboxlayer',
  description:
    'Email validation and verification API that checks syntax, MX records, SMTP existence, disposable/free provider detection, role-based address identification, and deliverability scoring.',
  metadata: {},
  config,
  auth
});
