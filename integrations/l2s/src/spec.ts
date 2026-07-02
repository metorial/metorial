import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'l2s',
  name: 'L2S',
  description:
    'URL shortening platform with link management, UTM tracking, QR codes, and click analytics.',
  metadata: {},
  config,
  auth
});
