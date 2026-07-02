import { Slate } from 'slates';
import { spec } from './spec';
import {
  applyLightroomEdits,
  checkJobStatus,
  editPsd,
  generateImage,
  generativeExpand,
  generativeFill,
  indesignDataMerge,
  licenseStock,
  listLibraries,
  listLibraryElements,
  manageLibrary,
  manageLightroomCatalog,
  manageUsers,
  removeBackground,
  searchStock
} from './tools';
import {
  assetEvents,
  cloudDocumentEvents,
  libraryEvents,
  photoshopJobEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listLibraries,
    manageLibrary,
    listLibraryElements,
    removeBackground,
    editPsd,
    generateImage,
    generativeFill,
    generativeExpand,
    searchStock,
    licenseStock,
    manageLightroomCatalog,
    applyLightroomEdits,
    manageUsers,
    indesignDataMerge,
    checkJobStatus
  ],
  triggers: [assetEvents, libraryEvents, cloudDocumentEvents, photoshopJobEvents]
});
