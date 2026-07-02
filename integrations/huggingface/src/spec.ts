import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hugging-face',
  name: 'Hugging Face',
  description:
    'Platform for hosting and sharing machine learning models, datasets, and application demos (Spaces) via Git-based repositories, with inference APIs for running predictions.',
  metadata: {},
  config,
  auth
});
