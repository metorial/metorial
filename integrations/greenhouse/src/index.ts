import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCandidateNoteTool,
  advanceApplicationTool,
  createCandidateTool,
  createJobTool,
  getApplicationTool,
  getCandidateTool,
  getJobTool,
  getUserTool,
  listApplicationsTool,
  listCandidatesTool,
  listDepartmentsTool,
  listJobsTool,
  listOffersTool,
  listOfficesTool,
  listScheduledInterviewsTool,
  listUsersTool,
  manageCandidateTagsTool,
  rejectApplicationTool,
  updateCandidateTool
} from './tools';
import {
  applicationEventsTrigger,
  candidateEventsTrigger,
  interviewEventsTrigger,
  jobEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCandidatesTool,
    getCandidateTool,
    createCandidateTool,
    updateCandidateTool,
    listApplicationsTool,
    getApplicationTool,
    advanceApplicationTool,
    rejectApplicationTool,
    listJobsTool,
    getJobTool,
    createJobTool,
    listOffersTool,
    listUsersTool,
    getUserTool,
    listDepartmentsTool,
    listOfficesTool,
    listScheduledInterviewsTool,
    addCandidateNoteTool,
    manageCandidateTagsTool
  ],
  triggers: [
    applicationEventsTrigger,
    candidateEventsTrigger,
    jobEventsTrigger,
    interviewEventsTrigger
  ]
});
