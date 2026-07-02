import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'more-trees',
  name: 'More Trees',
  description:
    'Plant trees, track carbon offsets, and manage reforestation credits through the More Trees by THG Eco platform.',
  metadata: {},
  config,
  auth
});
