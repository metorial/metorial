import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'documenso',
  name: 'Documenso',
  description:
    'Open-source document signing platform for creating, sending, and managing legally binding electronic signatures on PDF documents.',
  metadata: {},
  config,
  auth
});
