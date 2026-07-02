import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAdmin,
  createBypassCodes,
  createGroup,
  createPhone,
  createUser,
  deleteAdmin,
  deleteGroup,
  deletePhone,
  deleteUser,
  getAccountSummary,
  getAdminLogs,
  getAuthenticationLogs,
  getTelephonyLogs,
  getUser,
  listAdmins,
  listGroups,
  listIntegrations,
  listPhones,
  listUsers,
  updateAdmin,
  updateUser
} from './tools';
import { adminActionEvents, authenticationEvents, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    createBypassCodes,
    listGroups,
    createGroup,
    deleteGroup,
    listPhones,
    createPhone,
    deletePhone,
    listAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    listIntegrations,
    getAuthenticationLogs,
    getAdminLogs,
    getTelephonyLogs,
    getAccountSummary
  ],
  triggers: [inboundWebhook, authenticationEvents, adminActionEvents]
});
