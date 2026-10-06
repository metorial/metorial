import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoominfo',
  name: 'ZoomInfo',
  description:
    'ZoomInfo GTM data intelligence: search and enrich contacts, companies, intent, scoops, news, corporate hierarchy and technologies; discover accepted fields and track API usage.',
  metadata: {},
  config,
  auth
});
