import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRecipientsToGroup,
  approveCampaign,
  bookCampaign,
  createCampaign,
  createGroup,
  createRecipient,
  deleteCampaign,
  deleteGroup,
  deleteRecipient,
  getAccountInfo,
  getCampaign,
  getCampaignCost,
  getRecipient,
  getReportSummary,
  listCampaigns,
  listGroups,
  listMailpieces,
  listRecipients,
  listTemplates,
  removeRecipientsFromGroup,
  sendLetter,
  sendPostcard,
  sendSms,
  validateAddress
} from './tools';
import {
  campaignStatus,
  mailpieceStatus,
  recipientBlacklisted,
  recipientEvent
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendPostcard,
    sendLetter,
    listRecipients,
    getRecipient,
    createRecipient,
    deleteRecipient,
    listGroups,
    createGroup,
    deleteGroup,
    addRecipientsToGroup,
    removeRecipientsFromGroup,
    listCampaigns,
    getCampaign,
    createCampaign,
    approveCampaign,
    bookCampaign,
    getCampaignCost,
    deleteCampaign,
    getReportSummary,
    listMailpieces,
    validateAddress,
    getAccountInfo,
    sendSms,
    listTemplates
  ],
  triggers: [campaignStatus, mailpieceStatus, recipientBlacklisted, recipientEvent]
});
