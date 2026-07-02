import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mural',
  name: 'Mural',
  description:
    'Digital workspace for visual collaboration with shared canvases for sticky notes, shapes, diagrams, and more.',
  metadata: {},
  config,
  auth
});
