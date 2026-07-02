import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'planyo-online-booking',
  name: 'Planyo Online Booking',
  description:
    'Online reservation system for businesses that take bookings for resources such as vacation properties, car rentals, hotels, equipment, event spaces, and professional services.',
  metadata: {},
  config,
  auth
});
