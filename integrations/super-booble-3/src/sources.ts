import type { SuperGoogleToolSource } from '@slates/super-google-tools';
import { provider as bigqueryProvider } from '@slates-integrations/bigquery';
import { provider as computeEngineProvider } from '@slates-integrations/compute-engine';
import { provider as firebaseProvider } from '@slates-integrations/firebase';
import { provider as addressValidationProvider } from '@slates-integrations/google-address-validation';
import { provider as cloudFunctionsProvider } from '@slates-integrations/google-cloud-functions';
import { provider as cloudSpeechProvider } from '@slates-integrations/google-cloud-speech';
import { provider as cloudStorageProvider } from '@slates-integrations/google-cloud-storage';
import { provider as cloudVisionProvider } from '@slates-integrations/google-cloud-vision';
import type { SuperGoogle3Config } from './config';

export let superGoogle3Sources: SuperGoogleToolSource<SuperGoogle3Config>[] = [
  {
    integration: 'compute-engine',
    provider: computeEngineProvider,
    mapConfig: config => ({
      projectId: config.projectId,
      defaultZone: config.defaultZone,
      defaultRegion: config.defaultRegion
    })
  },
  {
    integration: 'bigquery',
    provider: bigqueryProvider,
    mapConfig: config => ({
      projectId: config.projectId,
      location: config.bigQueryLocation
    })
  },
  {
    integration: 'google-cloud-storage',
    provider: cloudStorageProvider,
    mapConfig: config => ({ projectId: config.projectId })
  },
  {
    integration: 'google-cloud-functions',
    provider: cloudFunctionsProvider,
    mapConfig: config => ({
      projectId: config.projectId,
      region: config.functionsRegion
    })
  },
  {
    integration: 'google-cloud-speech',
    provider: cloudSpeechProvider,
    mapConfig: config => ({
      projectId: config.projectId,
      region: config.speechRegion
    })
  },
  { integration: 'google-cloud-vision', provider: cloudVisionProvider },
  {
    integration: 'google-address-validation',
    provider: addressValidationProvider,
    mapConfig: config => ({ projectId: config.projectId })
  },
  {
    integration: 'firebase',
    provider: firebaseProvider,
    mapConfig: config => ({
      projectId: config.projectId,
      databaseUrl: config.databaseUrl,
      storageBucket: config.storageBucket,
      webApiKey: config.webApiKey
    })
  }
];
