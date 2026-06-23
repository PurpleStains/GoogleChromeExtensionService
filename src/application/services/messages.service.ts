import axios, { AxiosInstance } from "axios";
import { Result } from "../../shared/patterns/result-pattern.js";
import { getValidToken } from "./token.service.js";
import { AllThreadsResponse, ClientMessages, Message, Thread, ThreadsResponse } from "../../infrastructure/allegro/types/messages.types.js";
import { clientsService } from "./clients.service.js";
import { allegroApiAxiosInstance } from "../../infrastructure/allegro/allegro.client.js";

const listAllThreads = async (httpClient: AxiosInstance, knownOffset?: number, maxOffset?: number): Promise<AllThreadsResponse> => {
    const allThreads: Thread[] = [];
    let offset = knownOffset ?? 0;
    const limit = 20;
    const defaultMaxOffset = 1000;
    const resolvedMaxOffset = maxOffset ?? defaultMaxOffset;

    while (true) {
        let threadsResponse: ThreadsResponse;
        try {
            const response = await httpClient.get<ThreadsResponse>("/messaging/threads", {
                params: { offset, limit },
            });
            threadsResponse = response.data;
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            const body = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
            throw new Error(`listAllThreads failed at offset ${offset}: ${status} ${body}`);
        }

        allThreads.push(...threadsResponse.threads);

        if (threadsResponse.threads.length < limit) {
            offset += threadsResponse.threads.length;
            break;
        }

        offset += limit;
        if (offset >= resolvedMaxOffset) {
            break;
        }
    }

    return { threads: allThreads, lastKnownOffset: offset };
};

const listMessages = async (httpClient: AxiosInstance, threadId: string): Promise<Message[]> => {
    try {
        const response = await httpClient.get<ClientMessages>(`/messaging/threads/${encodeURIComponent(threadId)}/messages`);
        return response.data.messages;
    } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        const body = axios.isAxiosError(err) ? JSON.stringify(err.response?.data) : String(err);
        throw new Error(`listMessages failed: ${status} ${body}`);
    }
};

const retrieveClientMessages = async (httpClient: AxiosInstance, threads: Thread[], clientLogin: string): Promise<Message[]> => {
    const relevantThreads = threads.filter((thread) => thread.interlocutor?.login === clientLogin);
    const clientMessages: Message[] = [];

    for (const thread of relevantThreads) {
        const threadMessages = await listMessages(httpClient, thread.id);
        clientMessages.push(...threadMessages.filter((message) => message.author?.login === clientLogin));
    }

    return clientMessages;
};

export const recentBuyerThreads = async (clientLogin: string, clientId: string): Promise<Result<Message[]>> => {
    const clientToken = await getValidToken(clientLogin);
    if (clientToken.isFailure()) {
        return Result.error(new Error("Unrecognized client login or token retrieval failed"));
    }

    const clientData = await clientsService.getClientByLogin(clientLogin);

    const { accessToken } = clientToken.getValue()!;
    const { userAgent } = clientData.getValue()!;

    const httpClient = allegroApiAxiosInstance(accessToken, userAgent);

    const recentOffset = 0;
    const defaultMaxOffset = 60;
    const lastSixtyThreads = await listAllThreads(httpClient, recentOffset, defaultMaxOffset);
    const messages = await retrieveClientMessages(httpClient, lastSixtyThreads.threads, clientId);

    const now = new Date();
    const defaultDaysInPast = 7;
    const fewDaysAgo = new Date(now);
    fewDaysAgo.setDate(now.getDate() - defaultDaysInPast);

    const recentMessages = messages.filter((msg) => {
        const createdDate = new Date(msg.createdAt);
        return createdDate >= fewDaysAgo;
    });

    return Result.success(recentMessages);
};
