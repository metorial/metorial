import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fomo',
  name: 'Fomo',
  description:
    'Social proof automation platform that displays real-time customer activity notifications on websites to build trust and increase conversions.',
  metadata: {},
  config,
  auth
});
