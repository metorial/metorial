import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'convertapi',
  name: 'ConvertAPI',
  description:
    'Cloud-based file conversion and document management API supporting 300+ file formats. Convert documents, manipulate PDFs, extract data, and generate documents.',
  metadata: {},
  config,
  auth
});
