import { Slate } from 'slates';
import { spec } from './spec';
import {
  commentOnIssue,
  createCommitStatus,
  createRelease,
  createRepository,
  getIssue,
  getRepository,
  getUser,
  listBranches,
  listCommits,
  listIssues,
  listPullRequests,
  listRepositories,
  manageCollaborators,
  manageFileContent,
  manageGist,
  manageIssue,
  manageLabels,
  managePullRequest,
  manageWorkflow,
  mergePullRequest,
  reviewPullRequest,
  search,
  starRepository,
  updateRepository
} from './tools';
import {
  issueCommentTrigger,
  issuesTrigger,
  pullRequestReviewTrigger,
  pullRequestTrigger,
  pushTrigger,
  releaseTrigger,
  starTrigger,
  workflowRunTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getRepository,
    listRepositories,
    createRepository,
    updateRepository,
    starRepository,
    manageIssue,
    listIssues,
    getIssue,
    commentOnIssue,
    managePullRequest,
    listPullRequests,
    mergePullRequest,
    reviewPullRequest,
    search,
    manageFileContent,
    manageWorkflow,
    createRelease,
    listCommits,
    listBranches,
    manageLabels,
    manageGist,
    manageCollaborators,
    getUser,
    createCommitStatus
  ],
  triggers: [
    pushTrigger,
    pullRequestTrigger,
    pullRequestReviewTrigger,
    issuesTrigger,
    issueCommentTrigger,
    workflowRunTrigger,
    releaseTrigger,
    starTrigger
  ]
});
