import { Slate } from 'slates';
import { spec } from './spec';
import {
  createLibrary,
  createTransformation,
  deleteLibrary,
  deleteTransformation,
  getLibrary,
  getLibraryVersion,
  getTransformation,
  getTransformationVersion,
  listLibraries,
  listLibraryVersions,
  listTransformations,
  listTransformationVersions,
  manageDestinationConnection,
  publish,
  testTransformations,
  updateLibrary,
  updateTransformation
} from './tools';

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
    publish,
    getTransformationVersion,
    getLibraryVersion,
    manageDestinationConnection,
    testTransformations
  ],
  triggers: []
});
