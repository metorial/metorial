import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCandidateTool,
  getAccountTool,
  getCandidateTool,
  getJobApplicationFormTool,
  getJobTool,
  listAccountCustomAttributesTool,
  listCandidateFilesTool,
  listCandidatesTool,
  listDepartmentsTool,
  listDisqualificationReasonsTool,
  listEmployeeFieldsTool,
  listEmployeesTool,
  listEventsTool,
  listJobCustomAttributesTool,
  listJobQuestionsTool,
  listJobsTool,
  listLegalEntitiesTool,
  listMembersTool,
  listStagesTool,
  listWorkSchedulesTool,
  manageCandidateTool,
  manageEmployeeTool,
  manageRequisitionTool,
  manageTimeOffTool
} from './tools';
import {
  candidateEventsTrigger,
  employeeEventsTrigger,
  timeoffEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listJobsTool,
    getJobTool,
    listCandidatesTool,
    getCandidateTool,
    createCandidateTool,
    manageCandidateTool,
    listEmployeesTool,
    manageEmployeeTool,
    manageRequisitionTool,
    listEventsTool,
    listDepartmentsTool,
    listMembersTool,
    listStagesTool,
    getJobApplicationFormTool,
    listJobQuestionsTool,
    listJobCustomAttributesTool,
    listAccountCustomAttributesTool,
    listDisqualificationReasonsTool,
    listLegalEntitiesTool,
    listWorkSchedulesTool,
    listEmployeeFieldsTool,
    listCandidateFilesTool,
    manageTimeOffTool,
    getAccountTool
  ],
  triggers: [candidateEventsTrigger, employeeEventsTrigger, timeoffEventsTrigger]
});
