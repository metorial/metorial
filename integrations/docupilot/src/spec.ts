import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docupilot',
  name: 'Docupilot',
  description:
    'Document automation platform for generating PDFs, DOCX, and other documents from templates with dynamic data merging, delivery automation, and eSignature capabilities.',
  metadata: {},
  config,
  auth
});
