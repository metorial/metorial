import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aivoov',
  name: 'AiVOOV',
  description:
    'Text-to-speech platform providing 2300+ AI voices from Google, Amazon, IBM, and Microsoft across 155+ languages.',
  metadata: {},
  config,
  auth
});
