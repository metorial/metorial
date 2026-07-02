import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'postgrid',
  name: 'PostGrid',
  description:
    'Send physical mail (letters, postcards, cheques, self-mailers) programmatically and verify postal addresses via PostGrid.',
  metadata: {},
  config,
  auth
});
