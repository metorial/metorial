import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'convertapi',
  name: 'ConvertAPI',
  description:
    'Convert files, process PDFs, retrieve conversion results, and manage temporary file storage.',
  metadata: {},
  config,
  auth
});
