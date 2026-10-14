import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkCreateUpdateOrders,
  createOrder,
  deleteOrders,
  getCompletionDetails,
  getDispatchStatus,
  getFileUrl,
  getOrders,
  getPlanningStatus,
  getRoutes,
  getSchedulingInfo,
  optimizeRoutes,
  searchOrders,
  sendRoutes,
  updateCompletionDetails,
  updateDriverParameters,
  updateDriverPositions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createOrder,
    bulkCreateUpdateOrders,
    getOrders,
    deleteOrders,
    searchOrders,
    optimizeRoutes,
    getPlanningStatus,
    getRoutes,
    sendRoutes,
    getDispatchStatus,
    getSchedulingInfo,
    updateDriverParameters,
    updateDriverPositions,
    getCompletionDetails,
    updateCompletionDetails,
    getFileUrl
  ],
  triggers: []
});
