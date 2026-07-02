import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'taggun',
  name: 'Taggun',
  description:
    'Receipt and invoice OCR API that extracts structured data from receipt and invoice images using machine learning. Supports multi-language and multi-region processing, fraud detection, purchase validation campaigns, merchant intelligence, and tax extraction.',
  metadata: {},
  config,
  auth
});
