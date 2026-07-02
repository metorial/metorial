import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hotspotsystem',
  name: 'HotspotSystem',
  description:
    'Cloud-based Wi-Fi hotspot management platform for deploying and managing captive portal hotspots, handling user authentication, access control, and billing.',
  metadata: {},
  config,
  auth
});
