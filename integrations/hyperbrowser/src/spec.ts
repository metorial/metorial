import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hyperbrowser',
  name: 'Hyperbrowser',
  description:
    'Cloud-based headless browser infrastructure for AI agents and web automation with built-in CAPTCHA solving, proxy management, and anti-bot detection.',
  metadata: {},
  config,
  auth
});
