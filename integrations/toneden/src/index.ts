import { Slate } from 'slates';
import { spec } from './spec';
import {
  attachmentInsights,
  campaignInsights,
  getProfile,
  linkInsights,
  listAttachments,
  listCampaigns,
  listLinks,
  manageAttachment,
  manageCampaign,
  manageLink,
  managePlaybook,
  manageUserList,
  updateProfile,
  uploadOfflineConversions
} from './tools';
import { campaignStatusChange, inboundWebhook, newAttachment, newLink } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    manageCampaign,
    campaignInsights,
    listLinks,
    manageLink,
    linkInsights,
    listAttachments,
    manageAttachment,
    attachmentInsights,
    managePlaybook,
    manageUserList,
    uploadOfflineConversions,
    getProfile,
    updateProfile
  ],
  triggers: [inboundWebhook, campaignStatusChange, newLink, newAttachment]
});
