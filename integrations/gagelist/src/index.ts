import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCalibration,
  createGage,
  createManufacturer,
  deleteCalibration,
  deleteGage,
  deleteManufacturer,
  generateCalibrationCertificate,
  getAccountSettings,
  getAccountStatus,
  getCalibration,
  getCustomFields,
  getCustomFieldValues,
  getGage,
  listCalibrations,
  listGages,
  listManufacturers,
  updateAccountSettings,
  updateCalibration,
  updateCustomFieldValues,
  updateGage,
  updateManufacturer
} from './tools';
import { inboundWebhook, newCalibration, newGage, newManufacturer } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createGage,
    getGage,
    updateGage,
    deleteGage,
    listGages,
    createCalibration,
    getCalibration,
    updateCalibration,
    deleteCalibration,
    listCalibrations,
    generateCalibrationCertificate,
    listManufacturers,
    createManufacturer,
    updateManufacturer,
    deleteManufacturer,
    getAccountStatus,
    getAccountSettings,
    updateAccountSettings,
    getCustomFields,
    getCustomFieldValues,
    updateCustomFieldValues
  ],
  triggers: [inboundWebhook, newGage, newCalibration, newManufacturer]
});
