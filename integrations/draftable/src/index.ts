import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComparison,
  deleteComparison,
  exportComparison,
  getChangeDetails,
  getComparison,
  getExportStatus,
  getViewerUrl,
  listComparisons
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    createComparison,
    getComparison,
    listComparisons,
    deleteComparison,
    getViewerUrl,
    exportComparison,
    getExportStatus,
    getChangeDetails
  ],
  triggers: [inboundWebhook]
});
