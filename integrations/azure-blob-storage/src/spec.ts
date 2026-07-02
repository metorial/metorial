import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'azure-blob-storage',
  name: 'Azure Blob Storage',
  description:
    'Microsoft Azure Blob Storage integration for managing containers, blobs, and storage lifecycle through a unified interface.',
  metadata: {},
  config,
  auth
});
