import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  addTeamMember,
  cancelCandidateInvite,
  createInterview,
  createTest,
  deleteInterview,
  getCandidateReport,
  getInterview,
  getInterviewTemplate,
  getQuestion,
  getTeam,
  getTest,
  getUser,
  inviteCandidate,
  listCandidates,
  listInterviews,
  listInterviewTemplates,
  listInviteTemplates,
  listQuestions,
  listTeams,
  listTests,
  listUsers,
  manageTeam,
  manageUser,
  removeTeamMember,
  updateCandidate,
  updateInterview,
  updateTest
} from './tools';

let screenTools = [
  listTests.build(),
  getTest.build(),
  createTest.build(),
  updateTest.build(),
  inviteCandidate.build(),
  listCandidates.build(),
  getCandidateReport.build(),
  updateCandidate.build(),
  cancelCandidateInvite.build(),
  listInviteTemplates.build()
];
let interviewTools = [
  createInterview.build(),
  listInterviews.build(),
  getInterview.build(),
  updateInterview.build(),
  deleteInterview.build(),
  listInterviewTemplates.build(),
  getInterviewTemplate.build()
];
let sharedTools = [
  addTeamMember.build(),
  getTeam.build(),
  getUser.build(),
  removeTeamMember.build(),
  manageUser.build(),
  listUsers.build(),
  manageTeam.build(),
  listTeams.build(),
  listQuestions.build(),
  getQuestion.build()
];

export let provider = Slate.create({
  spec,
  tools: [...screenTools, ...interviewTools, ...sharedTools],
  toolCategories: [
    toolCategory({
      key: 'screen',
      name: 'HackerRank Screen',
      description: 'Assessment tests, candidate invitations, and candidate reports.',
      tools: screenTools
    }),
    toolCategory({
      key: 'interview',
      name: 'HackerRank Interview',
      description: 'Live coding interviews, transcripts, schedules, and interview templates.',
      tools: interviewTools
    })
  ],
  triggers: []
});
