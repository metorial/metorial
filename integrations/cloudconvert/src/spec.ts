import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cloudconvert',
  name: 'CloudConvert',
  description:
    'File conversion and processing service supporting 200+ formats across audio, video, document, image, and more.',
  metadata: {},
  config,
  auth
});
