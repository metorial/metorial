import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docsautomator',
  name: 'DocsAutomator',
  description:
    'Document automation platform that generates PDFs and Google Docs from templates with placeholder-based data mapping. Supports e-signature workflows, multiple data sources, and webhook notifications.',
  metadata: {},
  config,
  auth
});
