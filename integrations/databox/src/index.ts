import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDataSource,
  createDataset,
  deleteDataSource,
  deleteDataset,
  getIngestionStatus,
  ingestData,
  listAccounts,
  listDatasets,
  listIngestions,
  listTimezones,
  purgeDataset,
  validateKey
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listAccounts,
    createDataSource,
    deleteDataSource,
    listDatasets,
    createDataset,
    deleteDataset,
    purgeDataset,
    ingestData,
    getIngestionStatus,
    listIngestions,
    listTimezones,
    validateKey
  ],
  triggers: [inboundWebhook]
});
