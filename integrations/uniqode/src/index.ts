import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  createQrCode,
  deleteQrCode,
  digitalBusinessCardTools,
  getAnalytics,
  getFormResponses,
  getQrAnalytics,
  getQrCode,
  listBeacons,
  listGeofences,
  listNfcTags,
  listOrganizations,
  listPlaces,
  listQrCodes,
  manageGeofence,
  manageLandingPage,
  setQrCodeState,
  updateBeacon,
  updateNfcTag,
  updateQrCode
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    ...digitalBusinessCardTools,
    setQrCodeState,
    getQrAnalytics,
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
  toolCategories: [
    toolCategory({
      key: 'qr-code',
      name: 'QR Code',
      description: 'Static and dynamic QR code management and scan analytics.',
      tools: [
        createQrCode,
        listQrCodes,
        getQrCode,
        updateQrCode,
        deleteQrCode,
        setQrCodeState,
        getQrAnalytics
      ]
    }),
    toolCategory({
      key: 'digital-business-card',
      name: 'Digital Business Card',
      description: 'Digital business card contact information, design, and lifecycle.',
      tools: digitalBusinessCardTools
    })
  ],
  triggers: []
});
