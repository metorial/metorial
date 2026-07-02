import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'llmwhisperer',
  name: 'LLMWhisperer',
  description:
    'Document preprocessing API that converts complex documents (PDFs, scanned images, Office documents, spreadsheets) into LLM-optimized text using OCR and AI enhancements.',
  metadata: {},
  config,
  auth
});
