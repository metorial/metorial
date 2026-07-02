import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteTool,
  calculateDistanceTool,
  calculateMatrixTool,
  deleteGeofenceTool,
  deleteUserTool,
  geocodeTool,
  getContextTool,
  getDirectionsTool,
  getEventTool,
  getGeofenceTool,
  getTripTool,
  getUserTool,
  listEventsTool,
  listGeofencesTool,
  listTripsTool,
  listUsersTool,
  searchGeofencesTool,
  searchNearbyUsersTool,
  searchPlacesTool,
  trackUserTool,
  updateTripTool,
  upsertGeofenceTool,
  validateAddressTool,
  verifyEventTool
} from './tools';
import { locationEventsTrigger, webhookEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    upsertGeofenceTool,
    listGeofencesTool,
    getGeofenceTool,
    deleteGeofenceTool,
    listUsersTool,
    getUserTool,
    deleteUserTool,
    searchNearbyUsersTool,
    listTripsTool,
    getTripTool,
    updateTripTool,
    geocodeTool,
    autocompleteTool,
    searchPlacesTool,
    searchGeofencesTool,
    calculateDistanceTool,
    getDirectionsTool,
    calculateMatrixTool,
    listEventsTool,
    getEventTool,
    verifyEventTool,
    validateAddressTool,
    trackUserTool,
    getContextTool
  ],
  triggers: [locationEventsTrigger, webhookEventsTrigger]
});
