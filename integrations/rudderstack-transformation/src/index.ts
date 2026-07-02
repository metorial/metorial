import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLibrary,
  createTransformation,
  deleteLibrary,
  deleteTransformation,
  getLibrary,
  getTransformation,
  listLibraries,
  listLibraryVersions,
  listTransformations,
  listTransformationVersions,
  publish,
  updateLibrary,
  updateTransformation
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    createTransformation,
    getTransformation,
    listTransformations,
    updateTransformation,
    deleteTransformation,
    listTransformationVersions,
    createLibrary,
    getLibrary,
    listLibraries,
    updateLibrary,
    deleteLibrary,
    listLibraryVersions,
    publish
  ],
  triggers: [inboundWebhook]
});
