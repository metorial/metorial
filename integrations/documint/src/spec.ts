import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'documint',
  name: 'Documint',
  description:
    'Document generation platform that dynamically merges data into pre-designed templates to produce customized PDFs such as invoices, proposals, contracts, certificates, and reports.',
  metadata: {},
  config,
  auth
});
