import { Slate } from 'slates';
import { spec } from './spec';
import {
  changeUnitState,
  createBooking,
  getReservation,
  listBlocks,
  listFolios,
  listProperties,
  listRatePlans,
  listReservations,
  listUnitGroups,
  listUnits,
  manageCompany,
  manageFolio,
  manageInvoice,
  manageReservation,
  searchOffers,
  triggerNightAudit
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listReservations,
    getReservation,
    createBooking,
    manageReservation,
    searchOffers,
    listProperties,
    listUnits,
    changeUnitState,
    listUnitGroups,
    listRatePlans,
    listFolios,
    manageFolio,
    manageInvoice,
    manageCompany,
    listBlocks,
    triggerNightAudit
  ],
  triggers: []
});
