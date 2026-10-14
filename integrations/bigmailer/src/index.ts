import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBulkCampaign,
  createField,
  createOrUpdateBrand,
  deleteContact,
  getBrand,
  getBulkCampaign,
  getContact,
  getIdentity,
  listBrands,
  listBulkCampaigns,
  listContacts,
  listFields,
  listLists,
  listSenders,
  listTransactionalCampaigns,
  manageList,
  manageSender,
  sendTransactionalEmail,
  upsertContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getIdentity,
    listBrands,
    getBrand,
    createOrUpdateBrand,
    listContacts,
    getContact,
    upsertContact,
    deleteContact,
    listLists,
    manageList,
    listFields,
    createField,
    listSenders,
    manageSender,
    sendTransactionalEmail,
    createBulkCampaign,
    listBulkCampaigns,
    getBulkCampaign,
    listTransactionalCampaigns
  ],
  triggers: []
});
