import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dreamstudio',
  name: 'DreamStudio',
  description:
    "AI-powered image generation, editing, upscaling, video, and 3D asset creation using Stability AI's Stable Diffusion models.",
  metadata: {},
  config,
  auth
});
