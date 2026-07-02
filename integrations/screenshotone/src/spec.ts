import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'screenshotone',
  name: 'ScreenshotOne',
  description:
    'Screenshot rendering API that captures website screenshots, renders HTML/Markdown to images or PDFs, and extracts page metadata.',
  metadata: {},
  config,
  auth
});
