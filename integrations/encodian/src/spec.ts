import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'encodian',
  name: 'Encodian',
  description: 'Convert, generate, extract, and process documents with Encodian Flowr.',
  metadata: {},
  config,
  auth
});
