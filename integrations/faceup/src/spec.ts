import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'faceup',
  name: 'FaceUp',
  description:
    'Whistleblowing and compliance case management platform for receiving anonymous reports, managing investigations, and maintaining audit trails.',
  metadata: {},
  config,
  auth
});
