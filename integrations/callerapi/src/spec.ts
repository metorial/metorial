import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'callerapi',
  name: 'CallerAPI',
  description:
    'Phone intelligence, caller identification, spam reputation, porting history, online presence, and carrier identity matching.',
  metadata: {},
  config,
  auth
});
