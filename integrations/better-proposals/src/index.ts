import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCompany,
  createCover,
  createDocumentType,
  createProposal,
  createQuote,
  editProposal,
  generateDocumentLinks,
  getCompany,
  getCurrency,
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
export let provider = Slate.create({
  spec,
  tools: [
    createCompany,
    createQuote,
    getCurrency,
    generateDocumentLinks,
    editProposal,
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
  triggers: []
});
