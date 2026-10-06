import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docuseal',
  name: 'DocuSeal',
  description:
    'Manage document templates, signature requests, signer state and downloadable PDFs.',
  metadata: {},
  config,
  auth
});
