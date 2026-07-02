import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-docs',
  name: 'Google Docs',
  description:
    'Create, read, edit, and format Google Docs documents. Insert and style text, manage tables, add images, create bulleted and numbered lists, and apply paragraph formatting. Use named ranges for template merging and dynamic content generation. Access document structure including headers, footers, and multiple tabs.',
  metadata: {},
  config,
  auth
});
