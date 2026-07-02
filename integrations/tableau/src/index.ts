import { Slate } from 'slates';
import { spec } from './spec';
import {
  exportView,
  getSiteInfo,
  getViewData,
  listDatasources,
  listViews,
  listWorkbooks,
  manageAlerts,
  manageCollections,
  manageCustomViews,
  manageDatasource,
  manageFavorites,
  manageFlows,
  manageGroups,
  manageJobs,
  managePermissions,
  manageProjects,
  manageUsers,
  manageWorkbook
} from './tools';
import {
  datasourceEvents,
  labelEvents,
  siteEvents,
  userEvents,
  viewEvents,
  workbookEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listWorkbooks,
    manageWorkbook,
    listDatasources,
    manageDatasource,
    listViews,
    getViewData,
    exportView,
    manageCustomViews,
    manageUsers,
    manageGroups,
    manageProjects,
    managePermissions,
    manageJobs,
    manageFavorites,
    manageFlows,
    manageCollections,
    manageAlerts,
    getSiteInfo
  ],
  triggers: [datasourceEvents, workbookEvents, userEvents, labelEvents, siteEvents, viewEvents]
});
