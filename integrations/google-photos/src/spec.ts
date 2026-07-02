import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-photos',
  name: 'Google Photos',
  description:
    "Upload, manage, and organize photos and videos in users' Google Photos libraries. Create and manage albums, search media items, and use the Picker API for secure photo selection.",
  metadata: {},
  config,
  auth
});
