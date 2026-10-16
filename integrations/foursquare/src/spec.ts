import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'foursquare',
  name: 'Foursquare',
  description:
    'Search and match Foursquare places, retrieve details, photos and tips, identify geotagging candidates, and suggest place data corrections. Includes current Places API tools and preserved legacy V3 tools, plus V2 OAuth user identity.',
  metadata: {},
  config,
  auth
});
