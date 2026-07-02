import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nasa',
  name: 'NASA',
  description:
    "Access NASA's extensive collection of space and Earth science data, imagery, and metadata through the api.nasa.gov platform.",
  metadata: {},
  config,
  auth
});
