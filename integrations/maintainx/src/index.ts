import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAsset,
  createLocation,
  createMeterReading,
  createPart,
  createPurchaseOrder,
  createVendor,
  createWorkOrder,
  createWorkRequest,
  deleteAsset,
  getAsset,
  getWorkOrder,
  listAssets,
  listCategories,
  listLocations,
  listMeters,
  listParts,
  listPurchaseOrders,
  listTeams,
  listUsers,
  listVendors,
  listWorkOrders,
  sendMessage,
  setAssetStatus,
  updateAsset,
  updateWorkOrder
} from './tools';
import {
  inboundWebhook,
  newWorkOrder,
  newWorkRequest,
  workOrderStatusChanged
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createWorkOrder,
    updateWorkOrder,
    getWorkOrder,
    listWorkOrders,
    createWorkRequest,
    createAsset,
    updateAsset,
    getAsset,
    listAssets,
    deleteAsset,
    setAssetStatus,
    listLocations,
    createLocation,
    listParts,
    createPart,
    listMeters,
    createMeterReading,
    listPurchaseOrders,
    createPurchaseOrder,
    listVendors,
    createVendor,
    listUsers,
    listTeams,
    listCategories,
    sendMessage
  ],
  triggers: [inboundWebhook, newWorkOrder, workOrderStatusChanged, newWorkRequest]
});
