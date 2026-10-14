import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBooking,
  getProject,
  getResource,
  getTimeEntry,
  listBookingCategories,
  listClients,
  listEvents,
  manageBooking,
  manageClient,
  manageEvent,
  manageHoliday,
  manageMilestone,
  manageProject,
  manageResource,
  manageTimeEntry,
  manageVacation,
  searchBookings,
  searchProjects,
  searchResources,
  searchTimeEntries
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageProject,
    getProject,
    searchProjects,
    manageResource,
    getResource,
    searchResources,
    manageBooking,
    getBooking,
    searchBookings,
    getTimeEntry,
    manageTimeEntry,
    searchTimeEntries,
    listEvents,
    manageEvent,
    manageMilestone,
    manageVacation,
    listClients,
    manageClient,
    manageHoliday,
    listBookingCategories
  ],
  triggers: []
});
