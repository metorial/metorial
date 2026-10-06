import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCreationToPrintlist,
  browseCreations,
  createCreation,
  createDiscount,
  createPrintlist,
  deletePrintlist,
  getCategories,
  getCreation,
  getMyCreations,
  getMyOrders,
  getMyPrintlists,
  getMyProfile,
  getMySales,
  getUser,
  notifyDownloaders,
  removeCreationFromPrintlist,
  searchCreations,
  updateCreation,
  updatePrintlist
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchCreations,
    browseCreations,
    getCreation,
    getMyProfile,
    getUser,
    getMySales,
    getMyOrders,
    getMyCreations,
    createCreation,
    updateCreation,
    getCategories,
    getMyPrintlists,
    createPrintlist,
    updatePrintlist,
    deletePrintlist,
    addCreationToPrintlist,
    removeCreationFromPrintlist,
    createDiscount,
    notifyDownloaders
  ],
  triggers: []
});
