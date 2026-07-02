import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCatalogVersion,
  getSiteProperties,
  manageBlog,
  manageBookings,
  manageCollections,
  manageContacts,
  manageDataItems,
  manageEvents,
  manageMedia,
  manageMembers,
  manageOrderFulfillments,
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
    getCatalogVersion,
    getSiteProperties,
    manageDataItems,
    managePricingPlans,
    manageMembers,
    manageMedia,
    manageOrderFulfillments
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
