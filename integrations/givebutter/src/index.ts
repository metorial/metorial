import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCampaign,
  createContact,
  createFund,
  createTransaction,
  deleteCampaign,
  deleteFund,
  getCampaign,
  getContact,
  getPayout,
  getPlan,
  getTicket,
  getTransaction,
  listCampaignMembers,
  listCampaigns,
  listCampaignTeams,
  listContacts,
  listFunds,
  listPayouts,
  listPlans,
  listTickets,
  listTransactions,
  updateCampaign,
  updateContact,
  updateFund
} from './tools';
import {
  campaignEvents,
  contactEvents,
  planEvents,
  ticketEvents,
  transactionEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    listContacts,
    getContact,
    createContact,
    updateContact,
    listTransactions,
    getTransaction,
    createTransaction,
    listFunds,
    createFund,
    updateFund,
    deleteFund,
    listPlans,
    getPlan,
    listTickets,
    getTicket,
    listPayouts,
    getPayout,
    listCampaignMembers,
    listCampaignTeams
  ],
  triggers: [campaignEvents, transactionEvents, contactEvents, ticketEvents, planEvents]
});
