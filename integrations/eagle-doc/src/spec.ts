import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eagle-doc',
  name: 'Eagle Doc',
  description:
    'AI-powered document processing and OCR API by S2Tec GmbH. Extract structured data from invoices, receipts, bank statements, passports, ID cards, resumes, and more in 40+ languages.',
  metadata: {},
  config,
  auth
});
