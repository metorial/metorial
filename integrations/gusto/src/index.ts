import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCompany,
  getCurrentContext,
  getPayroll,
  listContractors,
  listEmployees,
  listForms,
  listPayrolls,
  listPaySchedules,
  manageCompanyBenefit,
  manageCompanyLocation,
  manageContractor,
  manageContractorPayment,
  manageDepartment,
  manageEarningType,
  manageEmployee,
  manageEmployeeBenefit,
  manageGarnishment,
  manageJobCompensation,
  manageTimeOff,
  processPayroll
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCompany,
    getCurrentContext,
    listEmployees,
    manageEmployee,
    listContractors,
    manageContractor,
    listPayrolls,
    getPayroll,
    processPayroll,
    manageContractorPayment,
    manageCompanyBenefit,
    manageEmployeeBenefit,
    listPaySchedules,
    manageEarningType,
    manageTimeOff,
    manageGarnishment,
    manageCompanyLocation,
    manageDepartment,
    listForms,
    manageJobCompensation
  ],
  triggers: []
});
