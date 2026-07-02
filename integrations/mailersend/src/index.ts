import { Slate } from 'slates';
import { spec } from './spec';
import {
  addToSuppressions,
  createDomain,
  createIdentity,
  createVerificationList,
  deleteDomain,
  deleteIdentity,
  deleteRecipient,
  deleteTemplate,
  getActivity,
  getDomain,
  getRecipient,
  getSuppressions,
  getTemplate,
  getVerificationList,
  listDomains,
  listIdentities,
  listRecipients,
  listTemplates,
  removeFromSuppressions,
  sendEmail,
  sendSms,
  updateIdentity,
  verifyDomain,
  verifySingleEmail
} from './tools';
import { emailEvents, smsEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail,
    sendSms,
    listTemplates,
    getTemplate,
    deleteTemplate,
    listDomains,
    getDomain,
    createDomain,
    deleteDomain,
    verifyDomain,
    listIdentities,
    createIdentity,
    updateIdentity,
    deleteIdentity,
    verifySingleEmail,
    createVerificationList,
    getVerificationList,
    getActivity,
    getSuppressions,
    addToSuppressions,
    removeFromSuppressions,
    listRecipients,
    getRecipient,
    deleteRecipient
  ],
  triggers: [emailEvents, smsEvents]
});
