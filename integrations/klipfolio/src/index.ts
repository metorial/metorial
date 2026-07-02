import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDashboard,
  deleteDashboard,
  getDashboard,
  getDatasource,
  getDatasourceInstanceData,
  getKlip,
  getProfile,
  listClients,
  listDashboards,
  listDatasources,
  listKlips,
  listPublishedLinks,
  listRoles,
  listUsers,
  manageClient,
  manageDatasource,
  manageGroup,
  manageKlip,
  managePublishedLink,
  manageRole,
  manageUser,
  refreshDatasource,
  updateDashboard
} from './tools';
import { dashboardChanges, datasourceChanges, inboundWebhook, userChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    listKlips,
    getKlip,
    manageKlip,
    listDatasources,
    getDatasource,
    manageDatasource,
    refreshDatasource,
    getDatasourceInstanceData,
    listUsers,
    manageUser,
    listRoles,
    manageRole,
    listClients,
    manageClient,
    manageGroup,
    listPublishedLinks,
    managePublishedLink,
    getProfile
  ],
  triggers: [inboundWebhook, dashboardChanges, userChanges, datasourceChanges]
});
