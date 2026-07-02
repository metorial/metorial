import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAssetReportTool,
  createLinkTokenTool,
  createTransferTool,
  enrichTransactionsTool,
  evaluateSignalTool,
  exchangePublicTokenTool,
  getAccountsTool,
  getAssetReportTool,
  getAuthTool,
  getBalancesTool,
  getHoldingsTool,
  getIdentityTool,
  getInstitutionTool,
  getInvestmentTransactionsTool,
  getItemTool,
  getLiabilitiesTool,
  getTransactionsTool,
  getTransferTool,
  listTransfersTool,
  removeItemTool,
  searchInstitutionsTool,
  syncTransactionsTool
} from './tools';
import {
  assetsWebhookTrigger,
  holdingsWebhookTrigger,
  itemWebhookTrigger,
  transactionsWebhookTrigger,
  transferWebhookTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getAccountsTool,
    getBalancesTool,
    syncTransactionsTool,
    getTransactionsTool,
    getAuthTool,
    getIdentityTool,
    getHoldingsTool,
    getInvestmentTransactionsTool,
    getLiabilitiesTool,
    searchInstitutionsTool,
    getInstitutionTool,
    createLinkTokenTool,
    exchangePublicTokenTool,
    getItemTool,
    removeItemTool,
    createTransferTool,
    getTransferTool,
    listTransfersTool,
    evaluateSignalTool,
    enrichTransactionsTool,
    createAssetReportTool,
    getAssetReportTool
  ],
  triggers: [
    itemWebhookTrigger,
    transactionsWebhookTrigger,
    transferWebhookTrigger,
    holdingsWebhookTrigger,
    assetsWebhookTrigger
  ]
});
