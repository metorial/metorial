import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'epic-games',
  name: 'Epic Games',
  description:
    'Epic Online Services (EOS) integration for cross-platform game services including player authentication, friends, sanctions, player reports, ownership verification, and voice chat.',
  metadata: {},
  config,
  auth
});
