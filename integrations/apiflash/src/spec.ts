import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apiflash',
  name: 'ApiFlash',
  description:
    'Website screenshot API powered by Chrome on AWS Lambda. Captures full-page or element-specific screenshots with support for CSS/JS injection, custom headers, geolocation, and S3 export.',
  metadata: {},
  config,
  auth
});
