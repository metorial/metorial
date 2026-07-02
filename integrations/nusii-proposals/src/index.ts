import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveProposal,
  createClient,
  createLineItem,
  createProposal,
  createSection,
  deleteClient,
  deleteLineItem,
  deleteProposal,
  deleteSection,
  getAccount,
  getClient,
  getProposal,
  getSection,
  listActivities,
  listClients,
  listLineItems,
  listProposals,
  listSections,
  listTemplates,
  sendProposal,
  updateClient,
  updateLineItem,
  updateProposal,
  updateSection
} from './tools';
import { clientEvents, proposalEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    listProposals,
    getProposal,
    createProposal,
    updateProposal,
    deleteProposal,
    sendProposal,
    archiveProposal,
    listSections,
    getSection,
    createSection,
    updateSection,
    deleteSection,
    listLineItems,
    createLineItem,
    updateLineItem,
    deleteLineItem,
    listTemplates,
    listActivities,
    getAccount
  ],
  triggers: [proposalEvents, clientEvents]
});
