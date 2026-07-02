import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheckout,
  createCryptoInvoice,
  createDepositAddress,
  createFiatPayment,
  createPaymentLink,
  getCryptoRates,
  getProduct,
  getSmartContracts,
  getTransactions,
  manageWallet,
  sendPayout
} from './tools';
import { paymentNotification } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createCheckout,
    createCryptoInvoice,
    createPaymentLink,
    createDepositAddress,
    manageWallet,
    sendPayout,
    createFiatPayment,
    getTransactions,
    getCryptoRates,
    getProduct,
    getSmartContracts
  ],
  triggers: [paymentNotification]
});
