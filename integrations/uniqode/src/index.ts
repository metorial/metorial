import { Slate } from 'slates';
import { spec } from './spec';
import {
  createQrCode,
  deleteQrCode,
  getAnalytics,
  getFormResponses,
  getQrCode,
  listBeacons,
  listGeofences,
  listNfcTags,
  listPlaces,
  listQrCodes,
  manageGeofence,
  manageLandingPage,
  updateBeacon,
  updateNfcTag,
  updateQrCode
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createQrCode,
    listQrCodes,
    getQrCode,
    updateQrCode,
    deleteQrCode,
    manageGeofence,
    listGeofences,
    listBeacons,
    updateBeacon,
    listNfcTags,
    updateNfcTag,
    getAnalytics,
    listPlaces,
    manageLandingPage,
    getFormResponses
  ],
  triggers: []
});
