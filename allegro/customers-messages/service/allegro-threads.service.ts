import { Result } from "../../../shared/result-pattern.js";
import { refreshAndSaveToken } from "../../authorization-allegro/refresh-token/refresh-token.js";
import { getValidToken } from "../../authorization-allegro/storage/token/token.service.js";
import { AllThreadsResponse, ClientMessages, Message, Thread, ThreadsResponse } from "./types/index.js";

const listAllThreads = async (accessToken: string, knownOffset?: number, maxOffset?: number): Promise<AllThreadsResponse> => {
    const allThreads: Thread[] = [];
    let offset = knownOffset ? knownOffset : 0;
    const limit = 20; // Maximum allowed by the API
    const defaultMaxOffset = 1000;
    const hasToLoad = true;
    maxOffset = maxOffset ?? defaultMaxOffset;

    while (hasToLoad) {
        const response = await fetch(`https://api.allegro.pl/messaging/threads?offset=${offset}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.allegro.public.v1+json'
            }
        });

        if (!response.ok) {
            throw new Error(`listAllThreads failed at offset ${offset}: ${response.status} ${await response.text()}`);
        }

        const threadsResponse = await response.json() as ThreadsResponse;
        allThreads.push(...threadsResponse.threads);

        if (threadsResponse.threads.length < limit) {
            offset += threadsResponse.threads.length
            break;
        }

        offset += limit;
        if (offset >= maxOffset) {
            break;
        }
    }
    return { Threads: allThreads, LastKnownOffset: offset };
}

const listMessages = async (threadId: string, accessToken: string): Promise<Message[]> => {
    const resp = await fetch(
        `https://api.allegro.pl/messaging/threads/${encodeURIComponent(threadId)}/messages`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.allegro.public.v1+json'
            }
        }
    );
    if (!resp.ok) {
        throw new Error(`listMessages failed: ${resp.status} ${await resp.text()}`);
    }
    const clientMessages = await resp.json() as ClientMessages;
    return clientMessages.messages;
}

const retrieveClientMessages = async (
    threads: Thread[],
    clientLogin: string,
    accessToken: string
): Promise<Message[]> => {
    const relevantThreads: any[] = [];
    for (const t of threads) {
        if (t.interlocutor?.login == clientLogin) {
            relevantThreads.push(t);
        }
    }

    const clientMessages = await getRelevantMessagesForClient(relevantThreads, clientLogin, accessToken)
    return clientMessages ?? []
}

const getRelevantMessagesForClient = async (relevantThreads: Thread[], clientLogin: string, accessToken: string) => {
    const clientMessages: Message[] = [];
    for (const thread of relevantThreads) {
        const msgs = await listMessages(thread.id, accessToken);
        clientMessages.push(...msgs.filter(m => m.author?.login === clientLogin));
    }

    return clientMessages;
}

export const recentBuyerThreads = async (clientLogin: string, clientId: string): Promise<Result<Message[]>> => {
    const clientToken = await getValidToken(clientLogin);
    if (clientToken.isFailure()) {
        return Result.error(new Error("Unrecognized client login or token retrieval failed"));
    }
    const { accessToken } = clientToken.getValue()!;

    const getfreshTokenResult = await refreshAndSaveToken(clientLogin);
    if (getfreshTokenResult.isFailure()) {
        return Result.error(new Error("Failed to refresh token for client"));
    }

    const recentOffset = 0;
    const defaultMaxOffset = 60;

    const lastSixtyThreads = await listAllThreads(accessToken, recentOffset, defaultMaxOffset);
    const messages = await retrieveClientMessages(lastSixtyThreads.Threads, clientId, accessToken);

    const now = new Date();
    const defaultDaysInPast = 7;
    const fewDaysAgo = new Date(now);
    fewDaysAgo.setDate(now.getDate() - defaultDaysInPast);

    const recentMessages = messages
        .filter(msg => {
            const createdDate = new Date(msg.createdAt);
            return createdDate >= fewDaysAgo;
        });

    return Result.success(recentMessages);
}