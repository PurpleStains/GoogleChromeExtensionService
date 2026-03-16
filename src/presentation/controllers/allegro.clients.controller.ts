import { Request, Response } from "express";
import { CreateClient, GetClients } from "../../../allegro/authorization-allegro/storage/clients/clients-storage.js";
import { ClientData } from "../../infrastructure/allegro/allegro.types.js";

export const getAllClients = async (_req: Request, res: Response) => {
    const clientsResult = await GetClients();
    if (clientsResult.isFailure()) {
        return res.status(404).json({ error: clientsResult.getError()?.message });
    }

    res.json(clientsResult.getValue());
};

export const createAllegroClient = async (req: Request, res: Response) => {
    const { client_login, client_id, client_secret } = req.body;

    const clientData: ClientData = {
        clientLogin: client_login as string,
        clientId: client_id as string,
        clientSecret: client_secret as string,
    };

    const result = await CreateClient(clientData);

    if (result.isFailure()) {
        return res.status(400).json({ error: result.getError()?.message });
    }

    res.json(result.getValue());
};
