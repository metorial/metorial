import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twocaptcha',
  name: '2Captcha',
  description:
    'CAPTCHA solving and image recognition through asynchronous tasks, result retrieval, solution feedback, and account balance checks.',
  metadata: {},
  config,
  auth
});
