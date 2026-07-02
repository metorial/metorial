import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dataforseo',
  name: 'DataForSEO',
  description:
    'DataForSEO API v3 tools for SERP data, keyword research, DataForSEO Labs, backlinks, OnPage audits, domain analytics, content analysis, Merchant, Business Data, Google Play App Data, and AI Optimization.',
  metadata: {},
  config,
  auth
});
