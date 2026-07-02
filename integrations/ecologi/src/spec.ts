import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ecologi',
  name: 'Ecologi',
  description:
    'Ecologi is a climate action platform for funding tree planting and carbon avoidance projects worldwide. Purchase trees and carbon offsets programmatically, and retrieve public impact statistics for any user.',
  metadata: {},
  config,
  auth
});
