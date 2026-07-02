import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-cloud-vision',
  name: 'Google Cloud Vision',
  description:
    'Integrate with Google Cloud Vision API for image analysis including label detection, OCR, face detection, landmark recognition, and more.',
  metadata: {},
  config,
  auth
});
