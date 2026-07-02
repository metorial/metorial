import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'codemagic',
  name: 'Codemagic',
  description:
    'CI/CD service for building, testing, and deploying mobile applications. Supports Flutter, React Native, native iOS/Android, Unity, and more.',
  metadata: {},
  config,
  auth
});
