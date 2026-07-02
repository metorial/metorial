import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAddress,
  createBatch,
  createCustomsDeclaration,
  createManifest,
  createOrder,
  createParcelTemplate,
  createRefund,
  createShipment,
  getRates,
  getShipment,
  getTransaction,
  listAddresses,
  listCarrierAccounts,
  listOrders,
  listParcelTemplates,
  listTransactions,
  purchaseBatch,
  purchaseLabel,
  registerTracking,
  schedulePickup,
  trackShipment,
  validateAddress
} from './tools';
import { batchEvents, trackingUpdated, transactionEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createAddress,
    validateAddress,
    listAddresses,
    createShipment,
    getShipment,
    getRates,
    purchaseLabel,
    getTransaction,
    listTransactions,
    trackShipment,
    registerTracking,
    createCustomsDeclaration,
    createOrder,
    listOrders,
    listCarrierAccounts,
    createManifest,
    schedulePickup,
    createRefund,
    createParcelTemplate,
    listParcelTemplates,
    createBatch,
    purchaseBatch
  ],
  triggers: [trackingUpdated, transactionEvents, batchEvents]
});
