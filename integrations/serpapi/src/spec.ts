import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'serpapi',
  name: 'SerpApi',
  description:
    'Search supported web, image, news, video, shopping, Maps, Flights, Scholar, Trends and Jobs engines. Retrieve autocomplete, locations, account usage and exact search archives.',
  metadata: {},
  config,
  auth
});
