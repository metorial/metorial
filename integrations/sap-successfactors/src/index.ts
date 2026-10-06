import { Slate } from 'slates';
import { spec } from './spec';
import {
  getApiMetadata,
  getCompensation,
  getCurrentContext,
  getEmployee,
  getGoals,
  getJobApplication,
  getJobInfo,
  getOrgStructure,
  getPerformanceReviews,
  getSuccessionPlanning,
  getTimeAccounts,
  manageEmployee,
  manageTimeOff,
  queryOdataEntity,
  searchEmployees,
  searchJobRequisitions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentContext,
    getApiMetadata,
    getEmployee,
    searchEmployees,
    manageEmployee,
    getJobInfo,
    getOrgStructure,
    searchJobRequisitions,
    getJobApplication,
    manageTimeOff,
    getTimeAccounts,
    getPerformanceReviews,
    getGoals,
    getCompensation,
    getSuccessionPlanning,
    queryOdataEntity
  ],
  triggers: []
});
