import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fingertip',
  name: 'Fingertip',
  description:
    'All-in-one business platform for creating websites, managing bookings, sending invoices, processing orders, and handling client contacts.',
  metadata: {},
  config,
  auth
});
