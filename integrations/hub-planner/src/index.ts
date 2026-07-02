import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBooking,
  getProject,
  getResource,
  listBookingCategories,
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
import { bookingEvents, projectEvents, resourceEvents, timeEntryEvents } from './triggers';

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
    manageTimeEntry,
    searchTimeEntries,
    manageEvent,
    manageMilestone,
    manageVacation,
    manageClient,
    manageHoliday,
    listBookingCategories
  ],
  triggers: [projectEvents, bookingEvents, resourceEvents, timeEntryEvents]
});
