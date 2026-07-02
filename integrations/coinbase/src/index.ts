import { Slate } from 'slates';
import { spec } from './spec';
import {
  buySellCrypto,
  depositWithdraw,
  getCandles,
  getExchangeRates,
  getMarketData,
  getPrices,
  getTransactionSummary,
  getUserProfile,
  listFills,
  listPaymentMethods,
  listProducts,
  listTransactions,
  manageAccounts,
  manageAddresses,
  manageCommerceCharges,
  manageOrders,
  managePortfolios,
  sendCrypto
} from './tools';
import { accountNotifications, commerceChargeEvents, transactionPolling } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageAccounts,
    sendCrypto,
    listTransactions,
    buySellCrypto,
    depositWithdraw,
    manageOrders,
    managePortfolios,
    listProducts,
    getCandles,
    getMarketData,
    listFills,
    getTransactionSummary,
    listPaymentMethods,
    getPrices,
    getExchangeRates,
    getUserProfile,
    manageAddresses,
    manageCommerceCharges
  ],
  triggers: [accountNotifications, commerceChargeEvents, transactionPolling]
});
