import { createApiServiceError, getApiErrorStatus, pickDefined } from 'slates';
import { DialpadClient, isMissing } from './client';
import {
  changes,
  contactId,
  invalid,
  malformed,
  nativeId,
  object,
  phone,
  responseId,
  stringField,
  strings,
  text,
  timestamp
} from './contracts';
import * as models from './models';

type Context = {
  auth: { token: string; environment: string };
  input: Record<string, unknown>;
};
const line = (value: unknown, label: string, maximum = 1000): string => {
  const result = text(value, label);
  if ([...result].length > maximum || [...result].some(c => c.charCodeAt(0) < 32))
    invalid(`Provide a single-line ${label} within its documented length limit.`);
  return result;
};
const optionalLine = (value: unknown, label: string, maximum = 1000) =>
  value === undefined ? undefined : value === '' ? '' : line(value, label, maximum);
const email = (value: unknown) => {
  const result = line(value, 'email address', 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) invalid('Provide a valid email address.');
  return result;
};
const cursor = (value: unknown) =>
  value === undefined
    ? undefined
    : typeof value === 'string'
      ? value
      : invalid('Provide the exact pagination cursor returned by the previous page.');
const choice = (value: unknown, allowed: readonly string[], label: string): string =>
  typeof value === 'string' && allowed.includes(value)
    ? value
    : invalid(`Select a supported ${label}.`);
const group = (type: unknown, id: unknown): Record<string, unknown> => {
  if ((type === undefined) !== (id === undefined))
    invalid('Provide both group type and group ID.');
  return type === undefined
    ? {}
    : {
        type: choice(type, ['office', 'department', 'callcenter'], 'group type'),
        id: Number(nativeId(id, 'group ID'))
      };
};
const fields = (input: Record<string, unknown>, allowed: string[]) => {
  const unexpected = Object.keys(input).filter(
    key => input[key] !== undefined && !allowed.includes(key)
  );
  if (unexpected.length)
    invalid(
      'Remove fields that do not apply to the selected action. Check the field descriptions for supported inputs.'
    );
};
const array = (
  value: unknown,
  label: string,
  mapper: (v: unknown) => string
): string[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 1000)
    invalid(`Provide a bounded list of ${label}.`);
  return value.map(mapper);
};
const verified = (row: Record<string, unknown>, body: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(pickDefined(body)))
    if (JSON.stringify(row[key]) !== JSON.stringify(value)) malformed();
};
const verifyAccepted = async <T>(
  resourceType: string,
  resourceId: string,
  action: string,
  verify: () => Promise<T>
): Promise<T> => {
  try {
    return await verify();
  } catch (error) {
    const rawStatus = getApiErrorStatus(error);
    const status =
      typeof rawStatus === 'number' &&
      Number.isInteger(rawStatus) &&
      rawStatus >= 100 &&
      rawStatus <= 599
        ? rawStatus
        : undefined;
    const failure = createApiServiceError(
      `Dialpad accepted ${action} for ${resourceType} ID ${resourceId}, but verification failed. Reconcile this exact ID before retrying; the resource or history may remain.`,
      { reason: 'dialpad_effect_unverified', upstreamStatus: status, parent: {} }
    );
    failure.data.recovery = {
      resourceType,
      resourceId,
      action,
      accepted: true,
      verification: 'unverified'
    };
    throw failure;
  }
};
const userResult = (row: unknown) => {
  const value = models.user(row);
  return pickDefined({
    userId: value.userId,
    displayName: value.displayName,
    email: value.emails?.[0],
    state: value.state
  });
};

export async function invoke(
  ctx: Context,
  key: string
): Promise<{ output: Record<string, unknown>; message: string }> {
  const client = new DialpadClient(ctx.auth);
  const input = ctx.input;
  client.validate(input);
  const finish = (output: Record<string, unknown>, message: string) => ({
    output: pickDefined(output),
    message
  });
  if (key === 'get_user')
    return finish(
      models.user(await client.getUser(nativeId(input.userId, 'user ID', true))),
      'User retrieved.'
    );
  if (key === 'get_company')
    return finish(models.company(await client.getCompany()), 'Company retrieved.');
  if (key === 'list_users') {
    const result = await client.listUsers({
      cursor: cursor(input.cursor),
      email: input.email === undefined ? undefined : email(input.email),
      state:
        input.state === undefined
          ? undefined
          : choice(
              input.state,
              ['active', 'pending', 'suspended', 'deleted', 'cancelled'],
              'user state'
            )
    });
    return finish(
      { users: result.items.map(v => models.user(v)), nextCursor: result.cursor },
      'One page of users retrieved.'
    );
  }
  if (key === 'list_contacts') {
    const result = await client.listContacts({
      cursor: cursor(input.cursor),
      owner_id:
        input.ownerId === undefined ? undefined : nativeId(input.ownerId, 'owner user ID')
    });
    return finish(
      { contacts: result.items.map(v => models.contact(v)), nextCursor: result.cursor },
      'One page of contacts retrieved.'
    );
  }
  if (key === 'list_offices') {
    const result = await client.listOffices({ cursor: cursor(input.cursor) });
    return finish(
      { offices: result.items.map(v => models.office(v)), nextCursor: result.cursor },
      'One page of offices retrieved.'
    );
  }
  if (key === 'list_call_centers') {
    const result = await client.listCallCenters(nativeId(input.officeId, 'office ID'), {
      cursor: cursor(input.cursor)
    });
    return finish(
      { callCenters: result.items.map(v => models.callCenter(v)), nextCursor: result.cursor },
      'One page of call centers retrieved.'
    );
  }
  if (key === 'list_calls') {
    if ((input.targetType === undefined) !== (input.targetId === undefined))
      invalid('Provide both targetType and targetId to filter calls.');
    const after = timestamp(input.startedAfter, true),
      before = timestamp(input.startedBefore, true);
    if (after && before && Date.parse(after) >= Date.parse(before))
      invalid('startedAfter must precede startedBefore.');
    const result = await client.listCalls(
      pickDefined({
        cursor: cursor(input.cursor),
        started_after: after === undefined ? undefined : Date.parse(after),
        started_before: before === undefined ? undefined : Date.parse(before),
        target_type: input.targetType,
        target_id:
          input.targetId === undefined
            ? undefined
            : Number(nativeId(input.targetId, 'target ID'))
      })
    );
    return finish(
      { calls: result.items.map(v => models.call(v)), nextCursor: result.cursor },
      'One page of completed calls retrieved.'
    );
  }
  if (key === 'manage_user') {
    const action = choice(input.action, ['create', 'update', 'delete'], 'user action');
    if (input.timezone !== undefined)
      invalid(
        'timezone is readable but is not writable through this user API. Change it in Dialpad settings.'
      );
    if (action === 'delete') {
      fields(input, ['action', 'userId']);
      const id = nativeId(input.userId, 'user ID');
      await client.deleteUser(id);
      return finish(
        { userId: id, deleted: true },
        'The exact user returned a deleted state. Historical data may remain.'
      );
    }
    const body = pickDefined({
      first_name: optionalLine(input.firstName, 'first name'),
      last_name: optionalLine(input.lastName, 'last name'),
      office_id:
        input.officeId === undefined
          ? undefined
          : Number(nativeId(input.officeId, 'office ID')),
      license:
        input.license === undefined
          ? undefined
          : choice(
              input.license,
              [
                'admins',
                'agents',
                'dpde_all',
                'dpde_one',
                'lite_lines',
                'lite_support_agents',
                'magenta_lines',
                'talk',
                'user'
              ],
              'license'
            ),
      job_title: optionalLine(input.jobTitle, 'job title')
    });
    if (action === 'create') {
      fields(input, ['action', 'email', 'firstName', 'lastName', 'officeId', 'license']);
      const creation = {
        ...body,
        email: email(input.email),
        office_id: Number(nativeId(input.officeId, 'office ID'))
      };
      const row = object(await client.createUser(creation));
      const id = responseId(row.id);
      const readback = await verifyAccepted('user', id, action, async () => {
        const value = await client.getUser(id);
        verified(value, body);
        if (!strings(value.emails)?.includes(creation.email)) malformed();
        return value;
      });
      return finish(
        userResult(readback),
        'User provisioned and read back. License and billing effects may remain.'
      );
    }
    fields(input, [
      'action',
      'userId',
      'email',
      'firstName',
      'lastName',
      'officeId',
      'license',
      'doNotDisturb',
      'jobTitle'
    ]);
    const id = nativeId(input.userId, 'user ID', true);
    if (input.doNotDisturb !== undefined) {
      if (
        typeof input.doNotDisturb !== 'boolean' ||
        Object.keys(body).length ||
        input.email !== undefined
      )
        invalid(
          'Update doNotDisturb separately from other user fields to avoid partial multi-request changes.'
        );
      return finish(
        userResult(await client.toggleDnd(id, input.doNotDisturb)),
        'Do Not Disturb updated for the exact user.'
      );
    }
    if (input.email !== undefined) body.emails = [email(input.email)];
    changes(body);
    await client.updateUser(id, body);
    const readback = await client.getUser(id);
    verified(readback, body);
    return finish(userResult(readback), 'User updated and exact fields read back.');
  }
  if (key === 'manage_contact') {
    const action = choice(
      input.action,
      ['create', 'update', 'upsert', 'delete'],
      'contact action'
    );
    if (action === 'delete') {
      fields(input, ['action', 'contactId']);
      const id = contactId(input.contactId);
      await client.deleteContact(id);
      return finish(
        { contactId: id, deleted: true },
        'Exact contact deletion and subsequent absence verified.'
      );
    }
    const body = pickDefined({
      first_name: optionalLine(input.firstName, 'first name'),
      last_name: optionalLine(input.lastName, 'last name'),
      phones: array(input.phones, 'phone numbers', phone),
      emails: array(input.emails, 'email addresses', email),
      company_name: optionalLine(input.companyName, 'company name'),
      job_title: optionalLine(input.jobTitle, 'job title'),
      urls: array(input.urls, 'HTTPS or HTTP URLs', v => {
        const value = line(v, 'URL', 2000);
        let url: URL;
        try {
          url = new URL(value);
        } catch {
          return invalid('Provide a valid contact URL.');
        }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
          invalid('Provide an HTTP or HTTPS contact URL without credentials.');
        return value;
      })
    });
    if (action === 'update') {
      fields(input, [
        'action',
        'contactId',
        'firstName',
        'lastName',
        'phones',
        'emails',
        'companyName',
        'jobTitle',
        'urls'
      ]);
      const id = contactId(input.contactId);
      changes(body);
      await client.updateContact(id, body);
      const readback = await client.getContact(id);
      verified(readback, body);
      return finish(
        models.contact(readback, id),
        'Contact updated and exact fields read back.'
      );
    }
    fields(input, [
      'action',
      'externalUid',
      'firstName',
      'lastName',
      'phones',
      'emails',
      'companyName',
      'jobTitle',
      'urls'
    ]);
    body.first_name = line(input.firstName, 'first name');
    body.last_name = line(input.lastName, 'last name');
    if (action === 'create' && input.externalUid !== undefined)
      invalid(
        'externalUid is supported by upsert only. Select upsert to bind the external identifier.'
      );
    if (action === 'upsert') body.uid = line(input.externalUid, 'external UID');
    const row = object(
      action === 'upsert' ? await client.upsertContact(body) : await client.createContact(body)
    );
    const id = contactId(models.contact(row).contactId);
    const readback = await verifyAccepted('contact', id, action, async () => {
      const value = await client.getContact(id);
      verified(value, pickDefined({ ...body, uid: undefined }));
      return value;
    });
    return finish(
      models.contact(readback, id),
      'Contact saved and exact returned ID read back. Upsert may change an existing shared contact.'
    );
  }
  if (key === 'send_sms') {
    if (
      !Array.isArray(input.toNumbers) ||
      !input.toNumbers.length ||
      input.toNumbers.length > 10
    )
      invalid('Provide between one and ten SMS destinations.');
    if (input.inferCountryCode !== undefined && typeof input.inferCountryCode !== 'boolean')
      invalid('inferCountryCode must be boolean.');
    const numbers = input.toNumbers.map(v =>
      input.inferCountryCode === true ? line(v, 'destination number', 30) : phone(v)
    );
    if (input.inferCountryCode === true && numbers.some(v => !/^\+?\d{2,15}$/.test(v)))
      invalid('Use digits only for inferred-country SMS destinations.');
    const sender = group(input.senderGroupType, input.senderGroupId);
    const body = pickDefined({
      to_numbers: numbers,
      text: text(input.text, 'message text'),
      user_id:
        input.senderId === undefined
          ? undefined
          : Number(nativeId(input.senderId, 'sender user ID')),
      sender_group_type: sender.type,
      sender_group_id: sender.id,
      infer_country_code: input.inferCountryCode
    });
    const row = await client.sendSms(body);
    const id = responseId(row.id);
    if (!['pending', 'failed', 'success'].includes(String(row.message_status))) malformed();
    if (row.text !== undefined && row.text !== null && row.text !== body.text) malformed();
    if (
      input.inferCountryCode !== true &&
      row.to_numbers !== undefined &&
      JSON.stringify(row.to_numbers) !== JSON.stringify(numbers)
    )
      malformed();
    return finish(
      {
        success: row.message_status === 'success',
        accepted: row.message_status !== 'failed',
        messageId: id,
        status: row.message_status,
        deliveryResult: stringField(row.message_delivery_result)
      },
      'SMS native status returned. Pending acceptance does not prove delivery; message history remains.'
    );
  }
  if (key === 'initiate_call') {
    const caller = nativeId(input.callerUserId, 'caller user ID', true);
    if ((input.phoneNumber === undefined) === (input.targetUserId === undefined))
      invalid('Provide exactly one phoneNumber or targetUserId.');
    const identity = group(input.groupType, input.groupId);
    const custom =
      input.customData === undefined ? undefined : text(input.customData, 'custom call data');
    let number = input.phoneNumber === undefined ? undefined : phone(input.phoneNumber);
    const target =
      input.targetUserId === undefined
        ? undefined
        : nativeId(input.targetUserId, 'destination user ID');
    if (target) {
      const numbers = [
        ...new Set(models.user(await client.getUser(target)).phoneNumbers ?? [])
      ];
      if (numbers.length !== 1)
        invalid(
          'The destination user must have exactly one phone number; otherwise provide phoneNumber explicitly.'
        );
      number = phone(numbers[0]);
    }
    const row = await client.initiateCall(
      caller,
      pickDefined({
        phone_number: number,
        group_type: identity.type,
        group_id: identity.id,
        custom_data: custom
      })
    );
    const device = object(row.device);
    const deviceId = stringField(device.id);
    if (!deviceId) malformed();
    const owner = responseId(device.user_id, caller);
    return finish(
      { accepted: true, deviceId, callerUserId: owner },
      'Call initiation accepted by the native device. This response contains no call ID and does not prove the call connected.'
    );
  }
  if (key === 'manage_call') {
    const id = nativeId(input.callId, 'call ID');
    const action = choice(
      input.action,
      ['hangup', 'transfer', 'toggle_recording'],
      'call action'
    );
    if (action === 'toggle_recording')
      invalid(
        'The current recording API targets a user’s active call and cannot bind the supplied callId. Use Dialpad call controls for this exact call; no recording change was attempted.'
      );
    if (action === 'hangup') {
      fields(input, ['action', 'callId']);
      await client.hangupCall(id);
      return finish(
        { callId: id, actionPerformed: action, success: true, accepted: true },
        'Hangup request accepted for the exact call. Completion is not established by the empty response.'
      );
    }
    fields(input, [
      'action',
      'callId',
      'transferPhoneNumber',
      'transferUserId',
      'transferType'
    ]);
    if (input.transferType !== undefined)
      invalid(
        'warm/cold transferType is not supported by this native transfer endpoint. Omit it to use a documented direct destination.'
      );
    if ((input.transferPhoneNumber === undefined) === (input.transferUserId === undefined))
      invalid('Provide exactly one transferPhoneNumber or transferUserId.');
    const destination =
      input.transferPhoneNumber === undefined
        ? {
            target_type: 'user',
            target_id: Number(nativeId(input.transferUserId, 'destination user ID'))
          }
        : { number: phone(input.transferPhoneNumber) };
    const row = await client.transferCall(id, destination);
    const receipt = responseId(row.call_id);
    if ('number' in destination && row.transferred_to_number !== destination.number)
      malformed();
    return finish(
      {
        callId: id,
        transferCallId: receipt,
        transferredToNumber: stringField(row.transferred_to_number),
        transferredToState: stringField(row.transferred_to_state),
        actionPerformed: action,
        success: true,
        accepted: true
      },
      'Native transfer receipt returned. Original and returned call IDs are preserved separately.'
    );
  }
  if (key === 'manage_call_center') {
    const action = choice(
      input.action,
      ['create', 'update', 'delete', 'add_operator', 'remove_operator'],
      'call-center action'
    );
    if (action === 'create' || action === 'update') {
      fields(input, [
        'action',
        action === 'create' ? 'officeId' : 'callCenterId',
        'name',
        'description'
      ]);
      const body = pickDefined({
        name: optionalLine(input.name, 'call-center name', 100),
        group_description: optionalLine(input.description, 'call-center description', 256)
      });
      if (action === 'create') body.name = line(input.name, 'call-center name', 100);
      else changes(body);
      const row = object(
        action === 'create'
          ? await client.createCallCenter(nativeId(input.officeId, 'office ID'), body)
          : await client.updateCallCenter(nativeId(input.callCenterId, 'call-center ID'), body)
      );
      const id = responseId(row.id);
      const readback = await verifyAccepted('call_center', id, action, async () => {
        const value = await client.getCallCenter(id);
        verified(value, body);
        return value;
      });
      return finish(
        { ...models.callCenter(readback), actionPerformed: action },
        'Call center saved and exact fields read back. Administrative and historical effects may remain.'
      );
    }
    const id = nativeId(input.callCenterId, 'call-center ID');
    if (action === 'delete') {
      fields(input, ['action', 'callCenterId']);
      await client.deleteCallCenter(id);
      return finish(
        { callCenterId: id, deleted: true, actionPerformed: action },
        'Exact call center returned a deleted state. Associated history is retained.'
      );
    }
    fields(input, [
      'action',
      'callCenterId',
      'operatorUserId',
      'operatorId',
      ...(action === 'add_operator' ? ['skillLevel'] : [])
    ]);
    if (
      input.operatorUserId !== undefined &&
      input.operatorId !== undefined &&
      nativeId(input.operatorUserId, 'operator user ID') !==
        nativeId(input.operatorId, 'operator user ID')
    )
      invalid('operatorId and operatorUserId must identify the same user.');
    const user = nativeId(input.operatorUserId ?? input.operatorId, 'operator user ID');
    const skill = input.skillLevel;
    if (
      skill !== undefined &&
      (typeof skill !== 'number' || !Number.isInteger(skill) || skill < 1 || skill > 100)
    )
      invalid('skillLevel must be an integer from 1 through 100.');
    if (action === 'add_operator')
      await client.addCallCenterOperator(
        id,
        pickDefined({ user_id: Number(user), skill_level: skill })
      );
    else await client.removeCallCenterOperator(id, user);
    const members = models.operators(await client.listCallCenterOperators(id));
    if (
      members.users === undefined ||
      members.users.some(item => item.userId === user) !== (action === 'add_operator')
    )
      malformed();
    return finish(
      { callCenterId: id, actionPerformed: action },
      'Exact operator membership independently read back. License or history effects may remain.'
    );
  }
  if (key === 'manage_phone_number') {
    const action = choice(input.action, ['list', 'assign', 'unassign'], 'number action');
    const type =
      input.targetType === undefined
        ? undefined
        : choice(
            input.targetType,
            ['user', 'office', 'room', 'call_router'],
            'number target type'
          ).replace('call_router', 'callrouter');
    const id =
      input.targetId === undefined ? undefined : nativeId(input.targetId, 'target ID');
    if (action === 'list') {
      fields(input, ['action', 'targetType', 'targetId', 'cursor']);
      const result = await client.listNumbers({ cursor: cursor(input.cursor) });
      const values = result.items
        .map(v => models.number(v))
        .filter(
          v =>
            (type === undefined || v.targetType === type) &&
            (id === undefined || v.targetId === id)
        );
      return finish(
        { numbers: values, nextCursor: result.cursor, actionPerformed: action },
        'One native number page retrieved; target filters apply to this page only. Continue the returned cursor even when this filtered page is empty.'
      );
    }
    fields(input, ['action', 'phoneNumber', 'targetType', 'targetId']);
    const value = phone(input.phoneNumber);
    if (action === 'assign') {
      if (!type || !id) invalid('Provide targetType and targetId for assignment.');
      await client.assignNumber(value, type, id);
      const row = models.number(await client.getNumber(value), value);
      if (row.targetType !== type || row.targetId !== id) malformed();
    } else {
      if ((type === undefined) !== (id === undefined))
        invalid(
          'Provide both targetType and targetId for an optional assignment precondition.'
        );
      const current = models.number(await client.getNumber(value), value);
      if (type && (current.targetType !== type || current.targetId !== id))
        invalid(
          'The exact number no longer has the requested assignment. Reconcile before unassigning.'
        );
      await client.unassignNumber(value);
      const row = models.number(await client.getNumber(value), value);
      if (row.targetId !== undefined || row.status !== 'available') malformed();
    }
    return finish(
      { success: true, actionPerformed: action },
      'Exact number assignment read back. Unassignment returns the number to the company pool without releasing it; concurrent changes are not atomically protected.'
    );
  }
  if (key === 'manage_blocked_number') {
    const action = choice(input.action, ['list', 'block', 'unblock'], 'blocked-number action');
    if (action === 'list') {
      fields(input, ['action', 'cursor']);
      const result = await client.listBlockedNumbers({ cursor: cursor(input.cursor) });
      return finish(
        {
          blockedNumbers: result.items.map(v => models.blocked(v)),
          nextCursor: result.cursor,
          actionPerformed: action
        },
        'One page of API-managed blocked numbers retrieved. Blocks created outside the API are excluded.'
      );
    }
    fields(input, ['action', action === 'block' ? 'phoneNumber' : 'blockedNumberId']);
    const value = phone(action === 'block' ? input.phoneNumber : input.blockedNumberId);
    if (action === 'block') {
      await client.blockNumber(value);
      await client.getBlockedNumber(value);
    } else {
      await client.getBlockedNumber(value);
      await client.unblockNumber(value);
      try {
        await client.getBlockedNumber(value);
      } catch (error) {
        if (isMissing(error))
          return finish(
            { success: true, actionPerformed: action },
            'The exact number is absent from API-managed blocks. Blocks outside the API are not covered.'
          );
        throw error;
      }
      malformed();
    }
    return finish(
      { success: true, actionPerformed: action },
      'Exact API-managed block read back.'
    );
  }
  if (key === 'get_resource') {
    const type = choice(
      input.resourceType,
      ['call', 'contact', 'office', 'call_center', 'phone_number', 'blocked_number'],
      'resource type'
    );
    const id = input.resourceId;
    let data: Record<string, unknown>;
    if (type === 'call') data = models.call(await client.getCall(nativeId(id, 'call ID')));
    else if (type === 'contact') data = models.contact(await client.getContact(contactId(id)));
    else if (type === 'office')
      data = models.office(await client.getOffice(nativeId(id, 'office ID')));
    else if (type === 'call_center')
      data = models.callCenter(await client.getCallCenter(nativeId(id, 'call-center ID')));
    else if (type === 'phone_number') data = models.number(await client.getNumber(phone(id)));
    else data = models.blocked(await client.getBlockedNumber(phone(id)));
    return finish({ resourceType: type, resource: data }, 'Exact resource retrieved.');
  }
  if (key === 'list_resources') {
    choice(input.resourceType, ['call_center_operators'], 'resource type');
    const id = nativeId(input.callCenterId, 'call-center ID');
    return finish(
      {
        resourceType: 'call_center_operators',
        callCenterId: id,
        ...models.operators(await client.listCallCenterOperators(id))
      },
      'Native user and room operator collections retrieved separately.'
    );
  }
  return invalid('Select a registered Dialpad tool.');
}
