import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'heap',
  name: 'Heap',
  description:
    'Heap is a digital analytics platform that automatically captures user interactions on websites and mobile apps. It provides product analytics, funnel analysis, segmentation, and retroactive analysis capabilities, along with server-side APIs for enriching data with custom events, user properties, and account properties.',
  metadata: {},
  config,
  auth
});
