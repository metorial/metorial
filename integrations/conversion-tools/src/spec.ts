import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'conversion-tools',
  name: 'Conversion Tools',
  description:
    'Online file conversion service supporting 100+ formats including documents, images, data formats, audio, video, eBooks, and subtitles. Features AI-powered extraction, OCR, and website capture.',
  metadata: {},
  config,
  auth
});
