import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sap-successfactors',
  name: 'SAP SuccessFactors',
  description:
    'Query authorized SAP SuccessFactors OData V2 records, discover tenant metadata, validate bearer tokens, and perform supported scalar insert or merge operations and workflow-aware time-off submissions.',
  metadata: {},
  config,
  auth
});
