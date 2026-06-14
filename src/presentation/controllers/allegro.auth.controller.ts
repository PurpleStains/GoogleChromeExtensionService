import { Request, Response } from "express";
import { generateCodeChallenge, generateCodeVerifier } from "../../shared/utils/authorization.utils.js";
import { logger } from '../../shared/logger.js';
import { clientsService } from "../../application/services/clients.service.js";
import crypto from 'crypto';
import { refreshAndSaveToken } from "../../application/services/token-refresh.service.js";
import { allegroAxiosInstance } from "../../infrastructure/allegro/allegro.client.js";
import { prepareToken } from "../../infrastructure/allegro/utils/token.utils.js";
import { AllegroTokenResponse } from "../../infrastructure/allegro/allegro.types.js";
import { saveToken } from "../../infrastructure/allegro/repositories/firestore-tokens.repository.js";

const AUTH_URL = `${process.env.ALLEGRO_API_BASE_URL}/auth/oauth/authorize`;
const TOKEN_URL_PATH = `auth/oauth/token`;
const REDIRECT_URI = process.env.NODE_ENV === 'production'
    ? `${process.env.SERVICE_API_URL_PROD}/allegro/callback`
    : `${process.env.SERVICE_API_URL_LOCAL}/allegro/callback`;

const codeVerifier = generateCodeVerifier();

export const allegroAuthorize = async (req: Request, res: Response) => {
    const { client_login } = req.query;
    const result = await clientsService.getClientByLogin(client_login as string);

    if (result.isFailure()) {
        return res.status(404).json({ error: result.getError()?.message });
    }

    const clientDetails = result.getValue();

    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    const url = new URL(AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientDetails?.clientId ?? "");
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', client_login as string);
    url.searchParams.set('prompt', 'confirm');

    logger.info('OAuth authorize initiated', { clientLogin: client_login });
    res.json({ url: url.toString() });
};

export const allegroAuthCallback = async (req: Request, res: Response) => {
    const { code, state: clientLogin } = req.query;

    if (!code || !clientLogin || typeof code !== 'string' || typeof clientLogin !== 'string') {
        return res.status(400).json({ error: 'Missing code or state' });
    }


    const client = await clientsService.getClientByLogin(clientLogin);
    if (client.isFailure()) {
        return res.status(404).json({ error: client.getError()?.message });
    }

    const clientData = client.getValue();

    const credentials = Buffer.from(`${clientData?.clientId}:${clientData?.clientSecret}`).toString('base64');

    const httpClient = allegroAxiosInstance(credentials, clientData?.userAgent ?? "");
    const resp = await httpClient.post(TOKEN_URL_PATH, {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
    });

    if (!resp.status || resp.status >= 400) {
        const errorText = await resp.data.text();
        await clientsService.setClientAuthorizationStatus(clientLogin, false);
        return res.status(resp.status).json({ error: `Token request failed: ${errorText}` });
    }

    const tokenResponse = await resp.data as AllegroTokenResponse;

    if (!tokenResponse.access_token) {
        await clientsService.setClientAuthorizationStatus(clientLogin, false);
        return res.status(400).json({ error: "Token response missing access_token" });
    }

    const tokenData = prepareToken(tokenResponse);

    await saveToken(clientLogin, tokenData);
    await clientsService.setClientAuthorizationStatus(clientLogin, true);
    logger.info('OAuth authorization successful', { clientLogin });
    return res.status(200).json({ message: "Authorization successful, you can close this window now." });
};

export const allegroRefreshToken = async (req: Request, res: Response) => {
    const { client_login } = req.body;
    const result = await refreshAndSaveToken(client_login as string);
    if (result.isFailure()) {
        logger.warn('Token refresh failed via endpoint', { clientLogin: client_login, error: result.getError()?.message });
        return res.status(400).json({ error: result.getError()?.message });
    }
    logger.info('Token refreshed via endpoint', { clientLogin: client_login });
    return res.status(200).json({ message: "Token refreshed successfully." });
};

