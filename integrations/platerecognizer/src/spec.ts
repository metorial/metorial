import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plate-recognizer',
  name: 'Plate Recognizer',
  description:
    'Automatic license plate recognition (ALPR) software that reads license plates from images. Also supports VIN extraction, shipping container ID, USDOT numbers, trailer ID, boat ID, and license plate/face blurring.',
  metadata: {},
  config,
  auth
});
