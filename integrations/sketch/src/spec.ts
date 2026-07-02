import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sketch',
  name: 'Sketch',
  description:
    'Work with Sketch design documents using the open JSON-based file format. Parse, inspect, and generate Sketch document structures including pages, artboards, layers, symbols, colors, and styles — all without requiring the Sketch Mac app.',
  metadata: {},
  config,
  auth
});
