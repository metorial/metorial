import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCover,
  createDocumentType,
  createProposal,
  getCompany,
  getProposal,
  getProposalCount,
  getQuote,
  getSettings,
  getTemplate,
  listCompanies,
  listCurrencies,
  listDocumentTypes,
  listProposals,
  listQuotes,
  listTemplates
} from './tools';
import { inboundWebhook, proposalStatusTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createProposal,
    listProposals,
    getProposal,
    getProposalCount,
    createCover,
    listTemplates,
    getTemplate,
    listCompanies,
    getCompany,
    listDocumentTypes,
    createDocumentType,
    listQuotes,
    getQuote,
    listCurrencies,
    getSettings
  ],
  triggers: [inboundWebhook, proposalStatusTrigger]
});
