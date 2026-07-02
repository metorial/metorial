import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoominfo',
  name: 'ZoomInfo',
  description:
    'B2B data intelligence platform with over 200 million business contacts and companies. Search, enrich, and monitor contacts, companies, intent signals, scoops, and news.',
  metadata: {},
  config,
  auth
});
