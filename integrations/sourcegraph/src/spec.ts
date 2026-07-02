import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sourcegraph',
  name: 'Sourcegraph',
  description:
    'Code intelligence platform providing code search, navigation, batch changes, and AI-powered code understanding across repositories and code hosts.',
  metadata: {},
  config,
  auth
});
