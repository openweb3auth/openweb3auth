import type {
    AnonCredsRegistry, GetCredentialDefinitionReturn, GetRevocationRegistryDefinitionReturn,
    GetRevocationStatusListReturn, GetSchemaReturn, RegisterCredentialDefinitionOptions,
    RegisterCredentialDefinitionReturn, RegisterRevocationRegistryDefinitionOptions, RegisterRevocationRegistryDefinitionReturn, RegisterRevocationStatusListOptions, RegisterRevocationStatusListReturn, RegisterSchemaOptions,
    RegisterSchemaReturn
} from '@credo-ts/anoncreds';
import type { AgentContext } from '@credo-ts/core';
import axios, { AxiosError } from 'axios';

/**
 * Remote RESTful implementation of the {@link AnonCredsRegistry} interface.
 */
export class RESTfulAnonCredsRegistry implements AnonCredsRegistry {
    public readonly supportedIdentifier = /.+/

    public constructor(
        private readonly endpoint: string
    ) { }
    registerRevocationRegistryDefinition(agentContext: AgentContext, options: RegisterRevocationRegistryDefinitionOptions): Promise<RegisterRevocationRegistryDefinitionReturn> {
        throw new Error('Method not implemented.');
    }
    registerRevocationStatusList(agentContext: AgentContext, options: RegisterRevocationStatusListOptions): Promise<RegisterRevocationStatusListReturn> {
        throw new Error('Method not implemented.');
    }

    public readonly methodName = 'restful'

    getRevocationRegistryDefinition(agentContext: AgentContext, revocationRegistryDefinitionId: string): Promise<GetRevocationRegistryDefinitionReturn> {
        throw new Error('Method not implemented.')
    }
    getRevocationStatusList(agentContext: AgentContext, revocationRegistryId: string, timestamp: number): Promise<GetRevocationStatusListReturn> {
        throw new Error('Method not implemented.')
    }

    public async getSchema(agentContext: AgentContext, schemaId: string): Promise<GetSchemaReturn> {
        try {
            const response = await axios.get(`${this.endpoint}/schemas/${schemaId}`);
            const schemaJson = response.data;

            return {
                resolutionMetadata: {},
                schema: {
                    name: schemaJson.name,
                    attrNames: schemaJson.attributes,
                    issuerId: schemaJson.issuerId,
                    version: schemaJson.version,
                },
                schemaId,
                schemaMetadata: {},
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error('Error getting schema', { error: axiosError.message });
            return {
                resolutionMetadata: {
                    error: 'notFound',
                    message: `Schema with id ${schemaId} not found in RESTful API`,
                },
                schemaId,
                schemaMetadata: {},
            };
        }
    }

    public async registerSchema(
        agentContext: AgentContext,
        options: RegisterSchemaOptions
    ): Promise<RegisterSchemaReturn> {
        try {
            const response = await axios.post(`${this.endpoint}/schemas`, options.schema);
            console.info('Registered schema', { schema: response.data });
            const schemaId = response.data.id;
            return {
                registrationMetadata: {},
                schemaMetadata: {},
                schemaState: {
                    state: 'finished',
                    schema: options.schema,
                    schemaId,
                },
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error('Error registering schema', { error: axiosError.message, data: axiosError.response!.data });
            return {
                registrationMetadata: {
                    error: 'failed',
                    message: `Failed to register schema in RESTful API: ${axiosError.message}`,
                },
                schemaMetadata: {},
                schemaState: {
                    state: 'failed',
                    reason: `Failed to register schema in RESTful API: ${axiosError.message}`,
                }
            }
        }
    }

    public async getCredentialDefinition(
        agentContext: AgentContext,
        credentialDefinitionId: string
    ): Promise<GetCredentialDefinitionReturn> {
        console.info('Getting credential definition', { credentialDefinitionId });
        try {
            const response = await axios.get(`${this.endpoint}/credentialDefinition/${credentialDefinitionId}`);
            const credentialDefinitionJson = response.data;

            return {
                resolutionMetadata: {},
                credentialDefinition: {
                    ...credentialDefinitionJson,
                    id: credentialDefinitionId,
                    schemaId: credentialDefinitionJson.schema.id,
                    type: credentialDefinitionJson.type,
                    value: credentialDefinitionJson.value,
                },
                credentialDefinitionId,
                credentialDefinitionMetadata: {},
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error('Error getting credential definition', { error: axiosError.message });
            return {
                resolutionMetadata: {
                    error: 'notFound',
                    message: `Credential definition with id ${credentialDefinitionId} not found in RESTful API`,
                },
                credentialDefinitionId,
                credentialDefinitionMetadata: {},
            };
        }
    }

    public async registerCredentialDefinition(
        agentContext: AgentContext,
        options: RegisterCredentialDefinitionOptions
    ): Promise<RegisterCredentialDefinitionReturn> {
        console.info('Registering credential definition', { options });
        try {
            const response = await axios.post(`${this.endpoint}/credentialDefinition`, options.credentialDefinition);
            const credentialDefinitionId = response.data.id;
            return {
                registrationMetadata: {},
                credentialDefinitionMetadata: {},
                credentialDefinitionState: {
                    state: 'finished',
                    credentialDefinition: options.credentialDefinition,
                    credentialDefinitionId,
                },
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            console.error('Error registering credential definition', { error: axiosError.message, data: axiosError.response?.data });
            return {
                registrationMetadata: {
                    error: 'failed',
                    message: `Failed to register credential definition in RESTful API: ${axiosError.message}`,
                },
                credentialDefinitionMetadata: {},
                credentialDefinitionState: {
                    state: 'failed',
                    reason: `Failed to register credential definition in RESTful API: ${axiosError.message}`,
                }
            }
        }
    }
}