import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComparison,
  createComparisonFromFiles,
  deleteComparison,
  exportComparison,
  getChangeDetails,
  getComparison,
  getExportStatus,
  getFileUrl,
  getViewerUrl,
  listComparisons
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    createComparison,
    createComparisonFromFiles,
    getComparison,
    listComparisons,
    deleteComparison,
    getViewerUrl,
    exportComparison,
    getExportStatus,
    getChangeDetails,
    getFileUrl
  ],
  triggers: []
});
