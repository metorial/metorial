import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'foursquare',
  name: 'Foursquare',
  description:
    'Location technology platform providing access to 100M+ points of interest across 200+ countries. Search, discover, and enrich place data with rich metadata including photos, reviews, ratings, and real-time popularity.',
  metadata: {},
  config,
  auth
});
