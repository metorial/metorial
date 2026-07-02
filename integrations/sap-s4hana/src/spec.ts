import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sap-s4hana',
  name: 'SAP S/4HANA',
  description:
    'Read SAP S/4HANA ERP data from tenant-configured OData APIs, including business partners, orders, billing documents, products, purchasing, and supplier invoices.',
  metadata: {},
  config,
  auth
});
