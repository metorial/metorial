import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docmosis',
  name: 'Docmosis',
  description:
    'Template-based document generation service that merges data with DOCX/ODT templates to produce PDF, DOCX, ODT, and other document formats.',
  metadata: {},
  config,
  auth
});
