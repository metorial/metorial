import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wakatime',
  name: 'WakaTime',
  description:
    'Automatic time tracking for programmers. Track coding activity by project, language, editor, and more.',
  metadata: {},
  config,
  auth
});
