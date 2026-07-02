import { Slate } from 'slates';
import { spec } from './spec';
import {
  getEmailLog,
  getEmailStats,
  getSandboxMessage,
  listAccounts,
  listEmailLogs,
  listSandboxMessages,
  listSandboxProjects,
  manageContact,
  manageContactList,
  manageSendingDomain,
  manageSuppressions,
  sendBulkEmail,
  sendTransactionalEmail
} from './tools';
import { emailEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendTransactionalEmail,
    sendBulkEmail,
    manageContact,
    manageContactList,
    listSandboxMessages,
    getSandboxMessage,
    listSandboxProjects,
    manageSendingDomain,
    manageSuppressions,
    getEmailStats,
    listEmailLogs,
    getEmailLog,
    listAccounts
  ],
  triggers: [emailEvent]
});
