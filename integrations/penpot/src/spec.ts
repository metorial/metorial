import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'penpot',
  name: 'Penpot',
  description:
    'Open-source design and prototyping platform for design and code collaboration, working with open standards (SVG, CSS, HTML).',
  metadata: {},
  config,
  auth
});
