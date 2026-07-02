import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'customgpt',
  name: 'CustomGPT',
  description:
    'CustomGPT.ai is a RAG platform that allows businesses to create custom AI chatbot agents from their own content. It ingests data from websites, documents, and multimedia to create knowledge-powered chatbots.',
  metadata: {},
  config,
  auth
});
