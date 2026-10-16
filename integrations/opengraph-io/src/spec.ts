import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'opengraphio',
  name: 'OpenGraph.io',
  description:
    'Retrieve Open Graph metadata, scrape HTML, download screenshots and Markdown documents, extract page content, ask AI-powered questions, and retrieve embeddable preview cards.',
  metadata: {},
  config,
  auth
});
