import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'uservoice',
  name: 'UserVoice',
  description:
    'Product feedback management platform for collecting, organizing, and prioritizing customer ideas and feature requests.',
  metadata: {},
  config,
  auth
});
