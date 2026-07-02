import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReferenceData = SlateTool.create(spec, {
  name: 'Get Reference Data',
  key: 'get_reference_data',
  description: `Retrieve system reference data such as order statuses, payment types, delivery types, order methods, stores, sites, units of measurement, and more. Use the **referenceType** field to specify which reference data to fetch. Useful for discovering available codes when creating or filtering orders and customers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      referenceType: z
        .enum([
          'statuses',
          'statusGroups',
          'paymentTypes',
          'paymentStatuses',
          'deliveryTypes',
          'deliveryServices',
          'orderMethods',
          'orderTypes',
          'productStatuses',
          'sites',
          'stores',
          'units',
          'countries'
        ])
        .describe('The type of reference data to retrieve')
    })
  )
  .output(
    z.object({
      referenceType: z.string().describe('The type of reference data returned'),
      entries: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of reference data entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let entries: Record<string, any>[] = [];
    let type = ctx.input.referenceType;

    if (type === 'statuses') {
      let result = await client.getStatuses();
      entries = Object.values(result.statuses || {});
    } else if (type === 'statusGroups') {
      let result = await client.getStatusGroups();
      entries = Object.values(result.statusGroups || {});
    } else if (type === 'paymentTypes') {
      let result = await client.getPaymentTypes();
      entries = Object.values(result.paymentTypes || {});
    } else if (type === 'paymentStatuses') {
      let result = await client.getPaymentStatuses();
      entries = Object.values(result.paymentStatuses || {});
    } else if (type === 'deliveryTypes') {
      let result = await client.getDeliveryTypes();
      entries = Object.values(result.deliveryTypes || {});
    } else if (type === 'deliveryServices') {
      let result = await client.getDeliveryServices();
      entries = Object.values(result.deliveryServices || {});
    } else if (type === 'orderMethods') {
      let result = await client.getOrderMethods();
      entries = Object.values(result.orderMethods || {});
    } else if (type === 'orderTypes') {
      let result = await client.getOrderTypes();
      entries = Object.values(result.orderTypes || {});
    } else if (type === 'productStatuses') {
      let result = await client.getProductStatuses();
      entries = Object.values(result.productStatuses || {});
    } else if (type === 'sites') {
      let result = await client.getSites();
      entries = Object.values(result.sites || {});
    } else if (type === 'stores') {
      let result = await client.getStores();
      entries = Object.values(result.stores || {});
    } else if (type === 'units') {
      let result = await client.getUnits();
      entries = Object.values(result.units || {});
    } else if (type === 'countries') {
      let result = await client.getCountries();
      entries = result.countriesIso.map(iso => ({ isoCode: iso }));
    }

    return {
      output: {
        referenceType: type,
        entries
      },
      message: `Retrieved **${entries.length}** ${type} entries.`
    };
  })
  .build();
