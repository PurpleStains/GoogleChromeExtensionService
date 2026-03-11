export interface Thread {
    id: string;
    read: boolean;
    lastMessageDateTime: string;
    interlocutor: {
        login: string;
        avatarUrl: string;
    };
}

export interface ThreadsResponse {
    limit: number;
    offset: number;
    threads: Thread[];
}

export interface ThreadDetail {
    id: string;
    subject?: string;
    relatesTo: {
        order?: { id: string };
        offer?: { id: string };
    };
}

export interface Message {
    id: string;
    text: string;
    createdAt: string;
    author: {
        login: string;
        isInterlocutor: boolean;  // true = client, false = seller
    };
    thread: { id: string };
    type: string;
}

export interface ClientMessages {
    limit: number;
    offset: number;
    messages: Message[];
}

export interface AllThreadsResponse {
    Threads: Thread[];
    LastKnownOffset: number;
}