import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'similarweb-digital-rank-api',
  name: 'SimilarWeb Digital Rank API',
  description:
    "Access global website ranking data powered by SimilarWeb's SimilarRank algorithm. Retrieve global rank, country rank, and category rank for any domain, discover top-ranked websites, and monitor API credit usage.",
  metadata: {},
  config,
  auth
});
