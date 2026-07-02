import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: '21risk',
  name: '21 Risk',
  description:
    'Retrieve compliance, audit, and risk management data from 21RISK. Access checklists, corrective actions, site information, COPE data, and compliance analytics via the OData API.',
  metadata: {},
  config,
  auth
});
