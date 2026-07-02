import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'livesession',
  name: 'LiveSession',
  description:
    'Product analytics platform focused on session replay, providing heatmaps, conversion funnels, custom metrics, and real-time error tracking for web applications.',
  metadata: {},
  config,
  auth
});
