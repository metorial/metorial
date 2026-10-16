import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface TriggerCommandParams {
  computer: string;
  trigger: string;
  params?: string;
}

let identitySchema = z.object({
  _id: z.string().nullish(),
  id: z.string().nullish()
});

let getId = (value: z.infer<typeof identitySchema>) => {
  let id = value.id || value._id;
  if (!id) {
    throw createApiServiceError('TRIGGERcmd returned a record without an ID.', {
      reason: 'triggercmd_invalid_response'
    });
  }
  return id;
};

let computerSchema = identitySchema
  .extend({
    name: z.string(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
  })
  .transform(value => ({
    _id: getId(value),
    name: value.name,
    createdAt: value.createdAt ?? undefined,
    updatedAt: value.updatedAt ?? undefined
  }));

let commandSchema = identitySchema
  .extend({
    name: z.string(),
    trigger: z.string().nullish(),
    voice: z.string().nullish(),
    voiceReply: z.string().nullish(),
    allowParams: z.boolean().nullish(),
    computer: z.union([z.string(), computerSchema]).nullish(),
    runCount: z.number().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    lastResult: z.string().nullish()
  })
  .transform(value => ({
    _id: getId(value),
    name: value.name,
    trigger: value.trigger ?? value.name,
    voice: value.voice ?? undefined,
    voiceReply: value.voiceReply ?? undefined,
    allowParams: value.allowParams ?? undefined,
    computer: typeof value.computer === 'string' ? value.computer : value.computer?._id,
    computerName:
      typeof value.computer === 'object' && value.computer !== null
        ? value.computer.name
        : undefined,
    runCount: value.runCount ?? undefined,
    createdAt: value.createdAt ?? undefined,
    updatedAt: value.updatedAt ?? undefined,
    lastResult: value.lastResult ?? undefined
  }));

let runSchema = identitySchema
  .extend({
    status: z.string(),
    createdAt: z.string()
  })
  .transform(value => ({
    _id: getId(value),
    status: value.status,
    createdAt: value.createdAt
  }));

let panelButtonSchema = identitySchema
  .extend({
    name: z.string(),
    panel: identitySchema.extend({ name: z.string() }),
    params: z.string().nullish()
  })
  .transform(value => ({
    buttonId: getId(value),
    name: value.name,
    panelId: getId(value.panel),
    panelName: value.panel.name,
    params: value.params ?? undefined
  }));

let parseRecords = <T>(data: unknown, schema: z.ZodType<T>, resource: string): T[] => {
  let records = isApiErrorRecord(data) ? data.records : data;
  let parsed = z.array(schema).safeParse(records);
  if (!parsed.success) {
    throw createApiServiceError(`TRIGGERcmd returned an invalid ${resource} response.`, {
      reason: 'triggercmd_invalid_response'
    });
  }
  return parsed.data;
};

let requireValue = (value: string, label: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`${label} must not be blank.`, {
      reason: 'triggercmd_invalid_input'
    });
  }
};

export class Client {
  private http;

  constructor(private token: string) {
    requireValue(token, 'TRIGGERcmd token');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.triggercmd.com',
      timeout: 30000,
      authHeader: { value: `Bearer ${token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'TRIGGERcmd',
          reason: 'triggercmd_api_error',
          detailKeys: ['err', 'error', 'message', 'error_description', 'code']
        })
    });
    this.http.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (isApiErrorRecord(data) && (data.err || data.error || data.success === false)) {
        throw buildApiServiceError(
          { response: { data } },
          {
            providerLabel: 'TRIGGERcmd',
            reason: 'triggercmd_api_error',
            detailKeys: ['err', 'error', 'message', 'error_description', 'code']
          }
        );
      }
      return response;
    });
  }

  async triggerCommand(params: TriggerCommandParams): Promise<unknown> {
    requireValue(params.computer, 'Computer name');
    requireValue(params.trigger, 'Trigger name');
    let response = await this.http.post('/api/run/triggerSave', pickDefined(params));
    return response.data;
  }

  async listComputers() {
    let response = await this.http.get('/api/computer/list');
    return parseRecords(response.data, computerSchema, 'computer list');
  }

  async listCommandsForComputer(computerId: string) {
    requireValue(computerId, 'Computer ID');
    let response = await this.http.post('/api/command/list', {
      computer_id: computerId
    });
    return parseRecords(response.data, commandSchema, 'command list');
  }

  async listAllCommands() {
    let response = await this.http.post('/api/command/list');
    return parseRecords(response.data, commandSchema, 'command list');
  }

  async listRuns(commandId: string) {
    requireValue(commandId, 'Command ID');
    let response = await this.http.get('/api/run/list', {
      params: {
        sortOn: 'createdAt,DESC',
        command_id: commandId,
        token: this.token
      }
    });
    return { records: parseRecords(response.data, runSchema, 'run history') };
  }

  async listPanelButtons() {
    let response = await this.http.get('/api/panelbutton/list', {
      params: { token: this.token }
    });
    return parseRecords(response.data, panelButtonSchema, 'panel button list');
  }

  async triggerPanelButton(input: { panel: string; button: string; params?: string }) {
    requireValue(input.panel, 'Panel name');
    requireValue(input.button, 'Button name');
    let response = await this.http.get('/api/panel/trigger', {
      params: { ...pickDefined(input), token: this.token }
    });
    return response.data as unknown;
  }
}
