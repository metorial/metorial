import { buildApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

let accountsResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string()
  }),
  accounts: z.array(z.object({ id: z.number(), name: z.string(), product: z.string() }))
});

export let getHarvestAccounts = async (token: string) => {
  let api = createAuthenticatedAxios({
    baseURL: 'https://id.getharvest.com/api/v2',
    authHeader: { value: `Bearer ${token}` },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Harvest ID',
        reason: 'harvest_id_api_error'
      })
  });
  let response = await api.get('/accounts');
  let parsed = accountsResponseSchema.safeParse(response.data);
  if (!parsed.success) {
    throw buildApiServiceError(parsed.error, {
      providerLabel: 'Harvest ID',
      reason: 'harvest_id_api_error',
      operation: 'account discovery'
    });
  }
  return {
    ...parsed.data,
    accounts: parsed.data.accounts.filter(account => account.product === 'harvest')
  };
};
