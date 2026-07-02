import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'adyntel',
  name: 'Adyntel',
  description:
    'Ad intelligence API for retrieving publicly available advertising data from Google, Meta, LinkedIn, and TikTok ad libraries. Provides competitive intelligence on paid ads, creatives, and keyword analysis with budget estimates.',
  metadata: {},
  config,
  auth
});
