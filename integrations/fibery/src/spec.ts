import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fibery',
  name: 'Fibery',
  description:
    'Work management platform with customizable workspaces, interconnected databases (Types), entities, documents, and views.',
  metadata: {},
  config,
  auth
});
