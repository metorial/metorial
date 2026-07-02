import {
  type SlatesNotifications,
  SlatesProviderProtoHandlerManager,
  type SlatesRequests,
  type SlatesResponses
} from '@slates/proto';
import type { Slate, SlateLogListener } from '@slates/provider';
import { createProviderHandler } from '@slates/provider-handler';
import { SlateProtocolError } from './error';
import type { SlatesMessageTransport } from './types';

type ProviderMessage = SlatesNotifications | SlatesRequests;
type ProviderResponse = SlatesNotifications | SlatesResponses;

let toTransportError = (value: unknown, defaultMessage: string) =>
  SlateProtocolError.fromUnknown(
    value,
    {
      code: 'transport.invoke_failed',
      kind: 'transport',
      message: defaultMessage,
      retryable: true,
      baggage: {
        response: value as any
      }
    },
    'transport'
  );

export let createLocalSlateTransport = <ConfigType extends {}, AuthType extends {}>(d: {
  slate: Slate<ConfigType, AuthType>;
  listeners?: SlateLogListener[];
}): SlatesMessageTransport => {
  let managerPromise = createProviderHandler(d.slate, d.listeners ?? []).run();

  return {
    async send(messages) {
      let manager = await managerPromise;
      let responses: ProviderResponse[] = [];

      for (let message of messages as ProviderMessage[]) {
        let response: any;
        try {
          response = await SlatesProviderProtoHandlerManager.handleInput(manager, message);
        } catch (error) {
          throw toTransportError(error, 'Local slate invocation failed');
        }

        if (response) {
          responses.push(response as ProviderResponse);
        }
      }

      return responses;
    }
  };
};
