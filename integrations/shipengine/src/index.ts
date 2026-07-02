import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelPickup,
  cancelShipment,
  createLabel,
  createManifest,
  createShipment,
  createWarehouse,
  deleteWarehouse,
  estimateRates,
  findServicePoints,
  getRates,
  listCarriers,
  listLabels,
  listShipments,
  listWarehouses,
  recognizeAddress,
  schedulePickup,
  trackPackage,
  updateShipment,
  updateWarehouse,
  validateAddress,
  voidLabel
} from './tools';
import {
  batchCompletedTrigger,
  carrierConnectedTrigger,
  orderSourceRefreshTrigger,
  rateUpdatedTrigger,
  reportCompleteTrigger,
  salesOrderImportedTrigger,
  trackingTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    validateAddress,
    recognizeAddress,
    getRates,
    estimateRates,
    createLabel,
    voidLabel,
    listLabels,
    trackPackage,
    createShipment,
    updateShipment,
    cancelShipment,
    listShipments,
    listCarriers,
    listWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    findServicePoints,
    schedulePickup,
    cancelPickup,
    createManifest
  ],
  triggers: [
    trackingTrigger,
    batchCompletedTrigger,
    carrierConnectedTrigger,
    rateUpdatedTrigger,
    reportCompleteTrigger,
    salesOrderImportedTrigger,
    orderSourceRefreshTrigger
  ]
});
