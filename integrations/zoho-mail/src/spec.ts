import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-mail',
  name: 'Zoho Mail',
  description:
    'Business email hosting service with REST APIs for managing emails, folders, labels, tasks, notes, bookmarks, and organization administration.',
  metadata: {},
  config,
  auth
});
