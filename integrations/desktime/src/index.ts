import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProject,
  getCompanyInfo,
  getCurrentUser,
  getEmployee,
  getEmployeeProjects,
  getEmployees,
  getProjects,
  startProjectTracking,
  stopProjectTracking
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getCompanyInfo,
    getCurrentUser,
    getEmployee,
    getEmployeeProjects,
    getEmployees,
    getProjects,
    createProject,
    startProjectTracking,
    stopProjectTracking
  ],
  triggers: []
});
