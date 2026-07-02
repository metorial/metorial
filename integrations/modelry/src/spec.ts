import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'modelry',
  name: 'Modelry',
  description:
    '3D product visualization platform by CGTrader for ordering, managing, and publishing custom 3D models for eCommerce.',
  metadata: {},
  config,
  auth
});
