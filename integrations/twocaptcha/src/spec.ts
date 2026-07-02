import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twocaptcha',
  name: '2Captcha',
  description:
    'Human-powered CAPTCHA solving and image recognition service that solves CAPTCHAs quickly and accurately using AI models backed by verified human workers.',
  metadata: {},
  config,
  auth
});
