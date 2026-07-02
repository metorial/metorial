import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelAbsence,
  createEmployee,
  createSickness,
  getAccount,
  getDepartmentData,
  getEmployee,
  listAbsences,
  listBonuses,
  listEmployees,
  listHolidayAllowances,
  listLeaveRequests,
  listOrganization,
  listOtherLeaveReasons,
  listSalaries,
  listSicknesses,
  listTraining,
  listWorkingPatterns,
  manageExpense,
  manageExpenseClaim,
  manageLeaveRequest
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listEmployees,
    getEmployee,
    createEmployee,
    listAbsences,
    cancelAbsence,
    manageLeaveRequest,
    listLeaveRequests,
    listSicknesses,
    createSickness,
    manageExpense,
    manageExpenseClaim,
    listBonuses,
    listSalaries,
    listOrganization,
    getDepartmentData,
    listTraining,
    listWorkingPatterns,
    listHolidayAllowances,
    listOtherLeaveReasons,
    getAccount
  ],
  triggers: [inboundWebhook]
});
