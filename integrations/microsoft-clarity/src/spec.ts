import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'microsoft-clarity',
  name: 'Microsoft Clarity',
  description:
    'Free web analytics tool providing session recordings, heatmaps, and behavioral insights including rage clicks, dead clicks, and excessive scrolling.',
  metadata: {},
  config,
  auth
});
