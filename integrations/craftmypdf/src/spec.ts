import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'craftmypdf',
  name: 'CraftMyPDF',
  description:
    'Generate PDF documents and images from reusable templates and JSON data. Supports synchronous and asynchronous generation, PDF merging, watermarking, fillable forms, and template management.',
  metadata: {},
  config,
  auth
});
