import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from '../index';

describeMcpCompatibleToolSchemas('LeadIQ tool input schemas', provider.actions);
