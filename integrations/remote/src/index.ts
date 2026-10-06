import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEmployment,
  downloadPayslip,
  estimateEmploymentCost,
  getCountryFormSchema,
  getCurrentIdentity,
  getEmployment,
  listCompanies,
  listContractAmendments,
  listCountries,
  listEmployments,
  listPayslips,
  manageExpenses,
  manageIncentives,
  manageOffboarding,
  manageTimeOff,
  manageTimesheets,
  updateEmployment
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentIdentity,
    listCompanies,
    listEmployments,
    getEmployment,
    createEmployment,
    updateEmployment,
    manageTimeOff,
    manageExpenses,
    manageIncentives,
    manageOffboarding,
    manageTimesheets,
    listCountries,
    getCountryFormSchema,
    estimateEmploymentCost,
    listPayslips,
    downloadPayslip,
    listContractAmendments
  ],
  triggers: []
});
