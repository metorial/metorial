import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'adobe-creative-cloud',
  name: 'Adobe Creative Cloud',
  description:
    'Integration with Adobe Creative Cloud APIs for managing libraries, editing images with Photoshop, generating content with Firefly AI, applying Lightroom presets, searching Adobe Stock, managing users, and automating InDesign document generation.',
  metadata: {},
  config,
  auth
});
