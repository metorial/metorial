import { Slate } from 'slates';
import { spec } from './spec';
import {
  activateSubscriber,
  addUpdateSubscriber,
  deactivateSubscriber,
  deleteCampaign,
  deleteSubscriber,
  findSubscriber,
  listCampaigns,
  listCustomFields,
  listSubcategories,
  manageCampaign,
  sendCampaign,
  sendTransactionalEmail,
  tagSubscriber,
  untagSubscriber
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    addUpdateSubscriber,
    findSubscriber,
    deactivateSubscriber,
    activateSubscriber,
    deleteSubscriber,
    tagSubscriber,
    untagSubscriber,
    sendTransactionalEmail,
    manageCampaign,
    sendCampaign,
    deleteCampaign,
    listCampaigns,
    listSubcategories,
    listCustomFields
  ],
  triggers: []
});
