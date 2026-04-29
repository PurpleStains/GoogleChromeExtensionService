import { Request, Response } from "express";
import { recentBuyerThreads } from "../../application/services/messages.service.js";
import { logger } from '../../shared/logger.js';

export const fetchCustomersMessages = async (req: Request, res: Response) => {
    const { client_login, customer_id } = req.query;
    if (!client_login || !customer_id || typeof client_login !== 'string' || typeof customer_id !== 'string') {
        return res.status(400).json({ error: "Missing or invalid client_login or customer_id query parameters" });
    }
    try {
        const messagesResult = await recentBuyerThreads(client_login, customer_id);
        if (messagesResult.isFailure()) {
            return res.status(400).json({ error: messagesResult.getError()?.message });
        }
        return res.status(200).json(messagesResult.getValue());
    }
    catch (err) {
        logger.error('Error retrieving messages', { stack: err instanceof Error ? err.stack : String(err) });
        return res.status(500).json({ error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) });
    }
};
