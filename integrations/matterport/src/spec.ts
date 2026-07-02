import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'matterport',
  name: 'Matterport',
  description:
    'A 3D spatial data platform for capturing, processing, and managing digital twins of physical spaces. Provides programmatic access to 3D models, metadata, assets, tags, and spatial intelligence.',
  metadata: {},
  config,
  auth
});
