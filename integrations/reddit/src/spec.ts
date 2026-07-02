import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'reddit',
  name: 'Reddit',
  description:
    'Social news aggregation and discussion platform organized into communities called subreddits, where users submit posts, comment, and vote on content.',
  metadata: {},
  config,
  auth
});
