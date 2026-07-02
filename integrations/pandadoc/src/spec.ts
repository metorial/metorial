import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pandadoc',
  name: 'PandaDoc',
  description:
    'Document automation platform for creating, sending, tracking, and electronically signing documents such as proposals, contracts, and quotes.',
  metadata: {},
  config,
  auth
});
