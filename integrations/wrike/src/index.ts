import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComment,
  createCustomField,
  createDependency,
  createFolder,
  createTask,
  createTimelog,
  deleteComment,
  deleteDependency,
  deleteTask,
  deleteTimelog,
  listAttachments,
  listComments,
  listContacts,
  listCustomFields,
  listDependencies,
  listFolders,
  listSpaces,
  listTasks,
  listTimelogs,
  listWorkflows,
  updateFolder,
  updateTask,
  updateTimelog
} from './tools';
import { approvalEvents, folderEvents, taskEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    listFolders,
    createFolder,
    updateFolder,
    listComments,
    createComment,
    deleteComment,
    listTimelogs,
    createTimelog,
    updateTimelog,
    deleteTimelog,
    listContacts,
    listSpaces,
    listWorkflows,
    listCustomFields,
    createCustomField,
    listDependencies,
    createDependency,
    deleteDependency,
    listAttachments
  ],
  triggers: [taskEvents, folderEvents, approvalEvents]
});
