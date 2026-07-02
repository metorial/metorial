import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'microsoft-fabric',
  name: 'Microsoft Fabric',
  description:
    'Microsoft Fabric analytics platform APIs for workspaces, OneLake files and tables, Fabric items, Data Pipelines, Dataflows, and Fabric API documentation resources.',
  metadata: {},
  config,
  auth
});
