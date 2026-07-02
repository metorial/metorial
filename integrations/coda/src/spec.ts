import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coda',
  name: 'Coda',
  description:
    'Collaborative document platform combining docs, spreadsheets, and applications into a single workspace.',
  metadata: {},
  config,
  auth
});
