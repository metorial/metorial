import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDepartment,
  createDivision,
  createJobTitle,
  createLocation,
  getCalendar,
  getEmployee,
  getTimeOffBudgets,
  hireEmployee,
  listEmployees,
  listJobApplications,
  listJobPositions,
  listOrganizationalStructure,
  listReferenceData,
  listTimeOffRequests,
  respondTimeOffRequest,
  updateEmployee
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getEmployee,
    listJobPositions,
    getTimeOffBudgets,
    getCalendar,
    listReferenceData,
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
