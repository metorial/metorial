import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stormboard',
  name: 'Stormboard',
  description:
    'Collaborative digital whiteboard platform for brainstorming, project planning, and idea organization using digital sticky notes, sections, and templates.',
  metadata: {},
  config,
  auth
});
