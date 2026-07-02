import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNoteComment,
  createProjectColor,
  createScreenNote,
  deleteScreenNote,
  getComponent,
  getDesignTokens,
  getFlowBoard,
  getProject,
  getScreen,
  getStyleguide,
  inviteProjectMember,
  listColors,
  listComponents,
  listFlowBoards,
  listOrganizations,
  listProjectMembers,
  listProjects,
  listScreenNotes,
  listScreens,
  listScreenVersions,
  listSpacingTokens,
  listStyleguides,
  listTextStyles,
  removeProjectMember,
  updateProject
} from './tools';
import { projectEvents, styleguideEvents, workspaceEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    getProject,
    updateProject,
    listProjectMembers,
    inviteProjectMember,
    removeProjectMember,
    listScreens,
    getScreen,
    listScreenVersions,
    listScreenNotes,
    createScreenNote,
    deleteScreenNote,
    addNoteComment,
    listComponents,
    getComponent,
    listStyleguides,
    getStyleguide,
    listColors,
    createProjectColor,
    listTextStyles,
    listSpacingTokens,
    getDesignTokens,
    listFlowBoards,
    getFlowBoard,
    listOrganizations
  ],
  triggers: [projectEvents, styleguideEvents, workspaceEvents]
});
