import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'similarweb-digital-rank-api',
  name: 'SimilarWeb Digital Rank API',
  description:
    "Access website ranking data powered by Similarweb's SimilarRank algorithm. Retrieve global, country, and industry rankings, discover top-ranked websites, monitor account credits, and check available countries and historical data.",
  metadata: {},
  config,
  auth
});
