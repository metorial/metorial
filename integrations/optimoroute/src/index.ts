import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkCreateUpdateOrders,
  createOrder,
  deleteOrders,
  getCompletionDetails,
  getOrders,
  getPlanningStatus,
  getRoutes,
  getSchedulingInfo,
  optimizeRoutes,
  searchOrders,
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
    getSchedulingInfo,
    updateDriverParameters,
    updateDriverPositions,
    getCompletionDetails,
    updateCompletionDetails
  ],
  triggers: []
});
