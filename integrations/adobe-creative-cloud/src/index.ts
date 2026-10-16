import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  applyLightroomEdits,
  checkJobStatus,
  editPsd,
  generateImage,
  generativeExpand,
  generativeFill,
  getCurrentUser,
  getLibrary,
  getLibraryElement,
  getStockAsset,
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
export let provider = Slate.create({
  spec,
  tools: [
    listLibraries,
    manageLibrary,
    listLibraryElements,
    getLibrary,
    getLibraryElement,
    getCurrentUser,
    getStockAsset,
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
  triggers: [],
  toolCategories: [
    toolCategory({
      key: 'libraries',
      name: 'Creative Cloud Libraries',
      tools: [listLibraries, manageLibrary, listLibraryElements, getLibrary, getLibraryElement]
    }),
    toolCategory({ key: 'photoshop', name: 'Photoshop', tools: [removeBackground, editPsd] }),
    toolCategory({
      key: 'firefly',
      name: 'Firefly',
      tools: [generateImage, generativeFill, generativeExpand]
    }),
    toolCategory({
      key: 'stock',
      name: 'Adobe Stock',
      tools: [searchStock, licenseStock, getStockAsset]
    }),
    toolCategory({
      key: 'lightroom',
      name: 'Lightroom',
      tools: [manageLightroomCatalog, applyLightroomEdits]
    }),
    toolCategory({ key: 'users', name: 'User Management', tools: [manageUsers] }),
    toolCategory({ key: 'indesign', name: 'InDesign', tools: [indesignDataMerge] })
  ]
});
