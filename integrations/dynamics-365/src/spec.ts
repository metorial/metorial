import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dynamics-365',
  name: 'Dynamics 365',
  description:
    'Unified Microsoft Dynamics 365 connector for Dataverse, Sales, Customer Service, Field Service, Contact Center, Customer Insights, Finance, Supply Chain, Project Operations, Commerce, Human Resources, and Business Central.',
  metadata: {
    product: 'Microsoft Dynamics 365',
    api: 'Dataverse Web API, Finance and Operations OData, Commerce Retail Server, and Business Central API v2.0'
  },
  config,
  auth
});
