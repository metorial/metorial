import { Slate } from 'slates';
import { spec } from './spec';
import {
  createInterview,
  createTest,
  getCandidateReport,
  getInterview,
  getQuestion,
  getTest,
  inviteCandidate,
  listCandidates,
  listInterviews,
  listQuestions,
  listTeams,
  listTests,
  listUsers,
  manageTeam,
  manageUser,
  updateTest
} from './tools';
import { candidateStatusChange, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTests.build(),
    getTest.build(),
    createTest.build(),
    updateTest.build(),
    inviteCandidate.build(),
    listCandidates.build(),
    getCandidateReport.build(),
    createInterview.build(),
    listInterviews.build(),
    getInterview.build(),
    manageUser.build(),
    listUsers.build(),
    manageTeam.build(),
    listTeams.build(),
    listQuestions.build(),
    getQuestion.build()
  ],
  triggers: [inboundWebhook, candidateStatusChange.build()]
});
