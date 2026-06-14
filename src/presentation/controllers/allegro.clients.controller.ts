import { Request, Response } from "express";
import { clientsService } from "../../application/services/clients.service.js";
import { ClientData } from "../../infrastructure/allegro/allegro.types.js";
import { logger } from '../../shared/logger.js';

export const getAllClients = async (_req: Request, res: Response) => {
    const clientsResult = await clientsService.getClients();
    if (clientsResult.isFailure()) {
        logger.error('Failed to retrieve clients', { error: clientsResult.getError()?.message });
        return res.status(404).json({ error: clientsResult.getError()?.message });
    }

    res.json(clientsResult.getValue());
};

export const createAllegroClient = async (req: Request, res: Response) => {
    const { client_login, client_id, client_secret, user_agent } = req.body;

    const clientData: ClientData = {
        clientLogin: client_login as string,
        clientId: client_id as string,
        clientSecret: client_secret as string,
        userAgent: user_agent as string,
    };

    const result = await clientsService.createClient(clientData);

    if (result.isFailure()) {
        logger.error('Failed to create client', { clientLogin: clientData.clientLogin, error: result.getError()?.message });
        return res.status(400).json({ error: result.getError()?.message });
    }

    logger.info('Client created', { clientLogin: clientData.clientLogin });
    res.json(result.getValue());
};
