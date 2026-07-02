import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scale-ai',
  name: 'Scale AI',
  description:
    'Data labeling and annotation platform for creating high-quality AI/ML training data from images, videos, text, documents, and 3D point clouds.',
  metadata: {},
  config,
  auth
});
