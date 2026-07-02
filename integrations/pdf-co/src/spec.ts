import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pdfco',
  name: 'Pdf.co',
  description: undefined,
  metadata: {},
  config,
  auth
});
