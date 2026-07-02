import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBulkCampaign,
  createField,
  createOrUpdateBrand,
  deleteContact,
  getBrand,
  getContact,
  listBrands,
  listBulkCampaigns,
  listContacts,
  listFields,
  listLists,
  listSenders,
  manageList,
  manageSender,
  sendTransactionalEmail,
  upsertContact
} from './tools';
import { emailEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
    listBulkCampaigns
  ],
  triggers: [emailEvents]
});
