import { Result } from "../../shared/patterns/result-pattern.js";
import { getValidToken } from "./token.service.js";
import { AllThreadsResponse, ClientMessages, Message, Thread, ThreadsResponse } from "../../infrastructure/allegro/types/messages.types.js";
import { clientsService } from "./clients.service.js";

const listAllThreads = async (accessToken: string, userAgent: string, knownOffset?: number, maxOffset?: number): Promise<AllThreadsResponse> => {
    const allThreads: Thread[] = [];
    let offset = knownOffset ?? 0;
    const limit = 20;
    const defaultMaxOffset = 1000;
    const resolvedMaxOffset = maxOffset ?? defaultMaxOffset;

    while (true) {
        const response = await fetch(`https://api.allegro.pl/messaging/threads?offset=${offset}&limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.allegro.public.v1+json",
                'User-Agent': userAgent,
            },
        });

        if (!response.ok) {
            throw new Error(`listAllThreads failed at offset ${offset}: ${response.status} ${await response.text()}`);
        }

        const threadsResponse = await response.json() as ThreadsResponse;
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

const listMessages = async (threadId: string, accessToken: string, userAgent: string): Promise<Message[]> => {
    const resp = await fetch(`https://api.allegro.pl/messaging/threads/${encodeURIComponent(threadId)}/messages`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.allegro.public.v1+json",
            'User-Agent': userAgent,
        },
    });

    if (!resp.ok) {
        throw new Error(`listMessages failed: ${resp.status} ${await resp.text()}`);
    }

    const clientMessages = await resp.json() as ClientMessages;
    return clientMessages.messages;
};

const retrieveClientMessages = async (threads: Thread[], clientLogin: string, accessToken: string, userAgent: string): Promise<Message[]> => {
    const relevantThreads = threads.filter((thread) => thread.interlocutor?.login === clientLogin);
    const clientMessages: Message[] = [];

    for (const thread of relevantThreads) {
        const threadMessages = await listMessages(thread.id, accessToken, userAgent);
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

    const recentOffset = 0;
    const defaultMaxOffset = 60;
    const lastSixtyThreads = await listAllThreads(accessToken, userAgent, recentOffset, defaultMaxOffset);
    const messages = await retrieveClientMessages(lastSixtyThreads.threads, clientId, accessToken, userAgent);

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
