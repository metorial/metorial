import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'html-to-image',
  name: 'HTML to Image',
  description:
    'Generate downloadable images and PDFs from HTML/CSS, public webpages, and reusable templates; browse image history and usage.',
  metadata: {},
  config,
  auth
});
