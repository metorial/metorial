import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'newsapi',
  name: 'Newsdata.io',
  description:
    'Search and retrieve current and historic news articles from over 150,000 worldwide sources using NewsAPI.',
  metadata: {},
  config,
  auth
});
