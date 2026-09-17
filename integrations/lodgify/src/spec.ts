import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lodgify',
  name: 'Lodgify',
  description:
    'Manage vacation rental properties, reservations, and guest communication in Lodgify. Browse property listings, room types, rate add-ons, and payment settings. Create and update bookings with status tracking, record check-in and check-out times, set door key codes, and move bookings to the trash or restore them. Handle pre-booking enquiries and the combined inbox. Query and update availability calendars, set nightly rates, generate quotes and payment links, and send or read guest messages.',
  metadata: {},
  config,
  auth
});
