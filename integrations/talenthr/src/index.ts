import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDepartment,
  createDivision,
  createJobTitle,
  createLocation,
  hireEmployee,
  listEmployees,
  listJobApplications,
  listOrganizationalStructure,
  listTimeOffRequests,
  respondTimeOffRequest,
  updateEmployee
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    hireEmployee,
    updateEmployee,
    listEmployees,
    createDepartment,
    createDivision,
    createJobTitle,
    createLocation,
    respondTimeOffRequest,
    listTimeOffRequests,
    listOrganizationalStructure,
    listJobApplications
  ],
  triggers: []
});
