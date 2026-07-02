import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCompensation,
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
import { employeeLifecycle, recruitingEvent, timeOffEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [employeeLifecycle, recruitingEvent, timeOffEvent]
});
