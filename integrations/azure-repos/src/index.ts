import { Slate } from 'slates';
import { spec } from './spec';
import {
  commentOnPullRequest,
  createBranch,
  createPullRequest,
  createRepository,
  deleteBranch,
  deleteRepository,
  getFileContent,
  getPullRequest,
  listBranches,
  listCommits,
  listPullRequests,
  listRepositories,
  searchCode,
  updatePullRequest,
  updateRepository
} from './tools';
import { codePush, pullRequestEvent, repositoryEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRepositories,
    createRepository,
    updateRepository,
    deleteRepository,
    listBranches,
    createBranch,
    deleteBranch,
    listPullRequests,
    getPullRequest,
    createPullRequest,
    updatePullRequest,
    commentOnPullRequest,
    listCommits,
    getFileContent,
    searchCode
  ],
  triggers: [codePush, pullRequestEvent, repositoryEvent]
});
