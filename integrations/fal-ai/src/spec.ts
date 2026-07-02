import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'falai',
  name: 'Fal.ai',
  description:
    'Serverless generative AI platform for running inference on image, video, audio, and 3D models.',
  metadata: {},
  config,
  auth
});
