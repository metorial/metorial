import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'screenshotfyi',
  name: 'Screenshot.fyi',
  description:
    'Capture high-quality screenshots of any website via API. Supports full-page captures, custom viewport sizes, dark mode, cookie banner removal, and multiple output formats.',
  metadata: {},
  config,
  auth
});
