import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lemlist',
  name: 'Lemlist',
  description:
    'Sales engagement and outreach platform for creating and automating personalized email and LinkedIn campaigns with lead management, multichannel sequences, contact enrichment, and a people database for prospecting.',
  metadata: {},
  config,
  auth
});
