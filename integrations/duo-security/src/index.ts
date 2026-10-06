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
  getResource,
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
export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    getUser,
    getResource,
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
  triggers: []
});
