import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCategory,
  createContact,
  createProduct,
  deleteCategory,
  deleteProduct,
  getBrand,
  getContact,
  getProduct,
  listAutomations,
  listCampaigns,
  listCategories,
  listContacts,
  listProducts,
  replaceProduct,
  sendEvent,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    getContact,
    listContacts,
    updateContact,
    createProduct,
    getProduct,
    listProducts,
    deleteProduct,
    sendEvent,
    listCampaigns,
    listAutomations,
    listCategories,
    createCategory,
    deleteCategory,
    getBrand,
    replaceProduct
  ],
  triggers: []
});
