import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wisepops',
  name: 'Wisepops',
  description:
    'Onsite marketing platform for creating and managing website popups, sticky bars, embeds, and notification campaigns. Provides contact/lead export, campaign reporting, webhook management, and data privacy operations.',
  metadata: {},
  config,
  auth
});
