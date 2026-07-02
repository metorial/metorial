import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'smugmug',
  name: 'SmugMug',
  description:
    'Photo hosting and sharing platform for photographers, offering image and video storage, organization into albums and folders, and online selling of prints.',
  metadata: {},
  config,
  auth
});
