import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'miro',
  name: 'Miro',
  description:
    'Online collaborative whiteboard platform for visual collaboration, diagramming, brainstorming, and project planning.',
  metadata: {},
  config,
  auth
});
