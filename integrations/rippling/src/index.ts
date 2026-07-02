import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  deleteGroup,
  getCompany,
  getCurrentUser,
  getEmployee,
  getGroup,
  getLeaveBalances,
  getSamlMetadata,
  listCustomFields,
  listDepartments,
  listEmployees,
  listLeaveRequests,
  listLeaveTypes,
  listLevels,
  listTeams,
  listWorkLocations,
  processLeaveRequest,
  pushCandidate,
  updateGroup
} from './tools';
import { companyActivity, employeeLifecycle } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listEmployees,
    getEmployee,
    getCompany,
    createGroup,
    getGroup,
    updateGroup,
    deleteGroup,
    listLeaveRequests,
    processLeaveRequest,
    pushCandidate,
    listDepartments,
    listTeams,
    listWorkLocations,
    listLevels,
    getSamlMetadata,
    listLeaveTypes,
    getLeaveBalances,
    getCurrentUser,
    listCustomFields
  ],
  triggers: [employeeLifecycle, companyActivity]
});
