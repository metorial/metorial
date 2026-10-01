import { getAccountInfo } from './tools/get-account-info';
import { getEmail } from './tools/get-email';
import { listEmails } from './tools/list-emails';
import { manageBookmarks } from './tools/manage-bookmarks';
import { manageFolders } from './tools/manage-folders';
import { manageLabels } from './tools/manage-labels';
import { manageNotes } from './tools/manage-notes';
import { manageOrganization } from './tools/manage-organization';
import { manageTasks } from './tools/manage-tasks';
import { searchEmails } from './tools/search-emails';
import { sendEmail } from './tools/send-email';
import { updateEmail } from './tools/update-email';

export let mailTools = [
  manageFolders,
  listEmails,
  searchEmails,
  manageOrganization,
  manageLabels,
  manageNotes,
  sendEmail,
  updateEmail,
  getAccountInfo,
  getEmail,
  manageTasks,
  manageBookmarks
];
