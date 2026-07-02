import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'roboflow',
  name: 'Roboflow',
  description:
    'Computer vision platform for uploading and annotating image datasets, training object detection and classification models, and deploying them via hosted inference APIs.',
  metadata: {},
  config,
  auth
});
