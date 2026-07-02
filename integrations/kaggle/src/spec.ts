import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kaggle',
  name: 'Kaggle',
  description:
    'Integration with Kaggle, the online platform for data science and machine learning. Access competitions, datasets, notebooks (kernels), and models programmatically.',
  metadata: {},
  config,
  auth
});
