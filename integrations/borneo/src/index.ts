import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAndScheduleScan,
  downloadReport,
  exportInventory,
  getCloudAccount,
  getResourceStatistics,
  getScanIteration,
  listInspectionResults,
  manageAsset,
  manageDashboardUser,
  manageDataBreach,
  manageDepartment,
  manageDomain,
  manageDpia,
  manageEmployee,
  manageHeadquarter,
  manageInfotypeCategory,
  manageLegalDocument,
  manageProcessingActivity,
  manageRecipient,
  manageScan
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createAndScheduleScan,
    manageScan,
    getScanIteration,
    listInspectionResults,
    manageDataBreach,
    manageEmployee,
    manageDepartment,
    manageHeadquarter,
    manageDomain,
    manageDashboardUser,
    manageProcessingActivity,
    manageDpia,
    manageRecipient,
    manageAsset,
    manageLegalDocument,
    manageInfotypeCategory,
    exportInventory,
    getResourceStatistics,
    downloadReport,
    getCloudAccount
  ],
  triggers: []
});
