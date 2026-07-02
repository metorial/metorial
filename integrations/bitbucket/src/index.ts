import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  browseSourceTool,
  commentOnIssueTool,
  commentOnPullRequestTool,
  createCommitStatusTool,
  createIssueTool,
  createPullRequestTool,
  createRepositoryTool,
  deleteRepositoryTool,
  forkRepositoryTool,
  getPullRequestTool,
  getRepositoryTool,
  listCommitsTool,
  listIssuesTool,
  listPullRequestCommentsTool,
  listPullRequestsTool,
  listRepositoriesTool,
  listWorkspaceMembersTool,
  manageBranchesTool,
  manageBranchRestrictionsTool,
  manageDefaultReviewersTool,
  managePipelinesTool,
  manageProjectsTool,
  managePullRequestTool,
  manageTagsTool,
  manageWebhooksTool,
  searchCodeTool,
  updateIssueTool,
  updateRepositoryTool
} from './tools';
import {
  issueEventsTrigger,
  pullRequestEventsTrigger,
  repositoryEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRepositoriesTool,
    getRepositoryTool,
    createRepositoryTool,
    updateRepositoryTool,
    deleteRepositoryTool,
    forkRepositoryTool,
    listPullRequestsTool,
    getPullRequestTool,
    createPullRequestTool,
    managePullRequestTool,
    commentOnPullRequestTool,
    listPullRequestCommentsTool,
    listIssuesTool,
    createIssueTool,
    updateIssueTool,
    commentOnIssueTool,
    manageBranchesTool,
    manageTagsTool,
    listCommitsTool,
    managePipelinesTool,
    browseSourceTool,
    searchCodeTool,
    listWorkspaceMembersTool,
    manageProjectsTool,
    createCommitStatusTool,
    manageWebhooksTool,
    manageDefaultReviewersTool,
    manageBranchRestrictionsTool
  ],
  triggers: [repositoryEventsTrigger, pullRequestEventsTrigger, issueEventsTrigger]
});
