import { Slate } from 'slates';
import { spec } from './spec';
import {
  getSiteProperties,
  manageBlog,
  manageBookings,
  manageCollections,
  manageContacts,
  manageDataItems,
  manageEvents,
  manageMedia,
  manageMembers,
  manageOrders,
  managePricingPlans,
  manageProducts
} from './tools';
import {
  blogEvents,
  bookingEvents,
  catalogEvents,
  contactEvents,
  ecommerceEvents,
  siteEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageProducts,
    manageOrders,
    manageContacts,
    manageBlog,
    manageBookings,
    manageEvents,
    manageCollections,
    getSiteProperties,
    manageDataItems,
    managePricingPlans,
    manageMembers,
    manageMedia
  ],
  triggers: [
    ecommerceEvents,
    catalogEvents,
    contactEvents,
    bookingEvents,
    blogEvents,
    siteEvents
  ]
});
