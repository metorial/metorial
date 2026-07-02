import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Polls NetSuite for newly created or recently modified records using SuiteQL. Detects changes to transaction, customer, vendor, contact, employee, and other record types that track lastModifiedDate.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was newly created or updated'),
      recordInternalId: z.string().describe('Internal ID of the changed record'),
      recordType: z.string().describe('NetSuite record type that changed'),
      lastModifiedDate: z.string().describe('Last modified timestamp of the record'),
      dateCreated: z.string().optional().describe('Creation timestamp of the record'),
      recordFields: z
        .record(z.string(), z.any())
        .describe('Key fields from the changed record')
    })
  )
  .output(
    z.object({
      recordInternalId: z.string().describe('Internal ID of the changed record'),
      recordType: z.string().describe('NetSuite record type that changed'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the record was newly created or updated'),
      lastModifiedDate: z.string().describe('Last modified timestamp'),
      dateCreated: z.string().optional().describe('Creation timestamp'),
      recordFields: z
        .record(z.string(), z.any())
        .describe('Key fields from the changed record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        ...ctx.auth,
        accountId: ctx.config.accountId
      });

      let state = ctx.state || {};
      let lastPollTime =
        state.lastPollTime || new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Format the timestamp for SuiteQL (NetSuite expects MM/DD/YYYY HH:MM:SS format)
      let pollDate = new Date(lastPollTime);
      let formattedDate = `${(pollDate.getMonth() + 1).toString().padStart(2, '0')}/${pollDate.getDate().toString().padStart(2, '0')}/${pollDate.getFullYear()} ${pollDate.getHours().toString().padStart(2, '0')}:${pollDate.getMinutes().toString().padStart(2, '0')}:${pollDate.getSeconds().toString().padStart(2, '0')}`;

      // Query for recently modified transactions
      let transactionQuery = `SELECT id, type, tranid, lastmodifieddate, datecreated, status, entity, memo FROM transaction WHERE lastmodifieddate > TO_DATE('${formattedDate}', 'MM/DD/YYYY HH24:MI:SS') ORDER BY lastmodifieddate ASC`;

      let transactionResults: any;
      try {
        transactionResults = await client.executeSuiteQL(transactionQuery, { limit: 200 });
      } catch {
        transactionResults = { items: [] };
      }

      // Query for recently modified customers
      let customerQuery = `SELECT id, companyname, email, datecreated, lastmodifieddate FROM customer WHERE lastmodifieddate > TO_DATE('${formattedDate}', 'MM/DD/YYYY HH24:MI:SS') ORDER BY lastmodifieddate ASC`;

      let customerResults: any;
      try {
        customerResults = await client.executeSuiteQL(customerQuery, { limit: 200 });
      } catch {
        customerResults = { items: [] };
      }

      // Query for recently modified vendors
      let vendorQuery = `SELECT id, companyname, email, datecreated, lastmodifieddate FROM vendor WHERE lastmodifieddate > TO_DATE('${formattedDate}', 'MM/DD/YYYY HH24:MI:SS') ORDER BY lastmodifieddate ASC`;

      let vendorResults: any;
      try {
        vendorResults = await client.executeSuiteQL(vendorQuery, { limit: 200 });
      } catch {
        vendorResults = { items: [] };
      }

      let inputs: {
        changeType: 'created' | 'updated';
        recordInternalId: string;
        recordType: string;
        lastModifiedDate: string;
        dateCreated?: string;
        recordFields: Record<string, any>;
      }[] = [];

      let latestTimestamp = lastPollTime;

      // Process transaction results
      for (let item of transactionResults.items || []) {
        let isNew = item.datecreated === item.lastmodifieddate;
        inputs.push({
          changeType: isNew ? 'created' : 'updated',
          recordInternalId: String(item.id),
          recordType: `transaction.${item.type || 'unknown'}`,
          lastModifiedDate: item.lastmodifieddate || '',
          dateCreated: item.datecreated,
          recordFields: item
        });
        if (item.lastmodifieddate && item.lastmodifieddate > latestTimestamp) {
          latestTimestamp = item.lastmodifieddate;
        }
      }

      // Process customer results
      for (let item of customerResults.items || []) {
        let isNew = item.datecreated === item.lastmodifieddate;
        inputs.push({
          changeType: isNew ? 'created' : 'updated',
          recordInternalId: String(item.id),
          recordType: 'customer',
          lastModifiedDate: item.lastmodifieddate || '',
          dateCreated: item.datecreated,
          recordFields: item
        });
        if (item.lastmodifieddate && item.lastmodifieddate > latestTimestamp) {
          latestTimestamp = item.lastmodifieddate;
        }
      }

      // Process vendor results
      for (let item of vendorResults.items || []) {
        let isNew = item.datecreated === item.lastmodifieddate;
        inputs.push({
          changeType: isNew ? 'created' : 'updated',
          recordInternalId: String(item.id),
          recordType: 'vendor',
          lastModifiedDate: item.lastmodifieddate || '',
          dateCreated: item.datecreated,
          recordFields: item
        });
        if (item.lastmodifieddate && item.lastmodifieddate > latestTimestamp) {
          latestTimestamp = item.lastmodifieddate;
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: latestTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `${ctx.input.recordType}.${ctx.input.changeType}`,
        id: `${ctx.input.recordType}-${ctx.input.recordInternalId}-${ctx.input.lastModifiedDate}`,
        output: {
          recordInternalId: ctx.input.recordInternalId,
          recordType: ctx.input.recordType,
          changeType: ctx.input.changeType,
          lastModifiedDate: ctx.input.lastModifiedDate,
          dateCreated: ctx.input.dateCreated,
          recordFields: ctx.input.recordFields
        }
      };
    }
  })
  .build();
