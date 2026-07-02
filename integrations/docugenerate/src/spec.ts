import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docugenerate',
  name: 'DocuGenerate',
  description:
    'Document generation platform that creates PDF, DOCX, and other format documents from reusable Word templates merged with dynamic JSON data.',
  metadata: {},
  config,
  auth
});
