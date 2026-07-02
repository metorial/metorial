import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'extractaai',
  name: 'Extracta.ai',
  description:
    'AI-powered document data extraction and classification service that turns unstructured documents into structured, actionable data.',
  metadata: {},
  config,
  auth
});
