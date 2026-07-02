import { WooCommerceClient } from './client';

export let createClient = (ctx: {
  config: { storeUrl: string };
  auth: { consumerKey: string; consumerSecret: string };
}) => {
  return new WooCommerceClient({
    storeUrl: ctx.config.storeUrl,
    consumerKey: ctx.auth.consumerKey,
    consumerSecret: ctx.auth.consumerSecret
  });
};
