import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'taggun',
  name: 'Taggun',
  description:
    'Receipt and invoice OCR API for structured extraction, validation campaigns, receipt feedback, and product category management.',
  metadata: {},
  config,
  auth
});
