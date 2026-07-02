import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCourseAnalyticsTool,
  getCourseTool,
  gradeSubmissionTool,
  listAssignmentsTool,
  listCalendarEventsTool,
  listConversationsTool,
  listCoursesTool,
  listEnrollmentsTool,
  listFilesTool,
  listModulesTool,
  listQuizzesTool,
  listSubmissionsTool,
  listUsersTool,
  manageAssignmentTool,
  manageCalendarEventTool,
  manageCourseTool,
  manageDiscussionTool,
  manageEnrollmentTool,
  manageModuleTool,
  managePageTool,
  sendMessageTool
} from './tools';
import {
  assignmentChangesTrigger,
  courseChangesTrigger,
  enrollmentChangesTrigger,
  inboundWebhook,
  newAnnouncementsTrigger,
  newSubmissionsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCoursesTool,
    getCourseTool,
    manageCourseTool,
    listUsersTool,
    listEnrollmentsTool,
    manageEnrollmentTool,
    listAssignmentsTool,
    manageAssignmentTool,
    listSubmissionsTool,
    gradeSubmissionTool,
    listModulesTool,
    manageModuleTool,
    manageDiscussionTool,
    managePageTool,
    listCalendarEventsTool,
    manageCalendarEventTool,
    listConversationsTool,
    sendMessageTool,
    listQuizzesTool,
    listFilesTool,
    getCourseAnalyticsTool
  ],
  triggers: [
    inboundWebhook,
    courseChangesTrigger,
    newSubmissionsTrigger,
    enrollmentChangesTrigger,
    newAnnouncementsTrigger,
    assignmentChangesTrigger
  ]
});
