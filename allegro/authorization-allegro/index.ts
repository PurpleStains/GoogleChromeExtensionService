import { Router, Request, Response } from "express";
import { generateCodeChallenge, generateCodeVerifier } from "./utils/authorization.utils.js";
import crypto from "crypto";
import { GetClient, SetClientAuthorizationStatus } from "./storage/clients/clients-storage.js";
import { AllegroTokenResponse } from "./types/token.type.js";
import { saveToken } from "./storage/token/token-storage.js";
import { prepareToken } from "./storage/token/token.utils.js";
import { refreshAndSaveToken } from "./refresh-token/refresh-token.js";

const allegroAuthRouter = Router();
const AUTH_URL = "https://allegro.pl/auth/oauth/authorize";
const TOKEN_URL = "https://allegro.pl/auth/oauth/token";
const REDIRECT_URI = process.env.NODE_ENV === 'production'
    ? `${process.env.SERVICE_API_URL_PROD}/allegro/callback`
    : `${process.env.SERVICE_API_URL_LOCAL}/allegro/callback`;

const codeVerifier = generateCodeVerifier();

allegroAuthRouter.get("/authorize", async (req: Request, res: Response) => {
    const { client_login } = req.query;
    const result = await GetClient(client_login as string);

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

    res.json({ url: url.toString() });
});

allegroAuthRouter.get("/callback", async (req: Request, res: Response) => {
    const { code, state: clientLogin } = req.query;

    if (!code || !clientLogin || typeof code !== 'string' || typeof clientLogin !== 'string') {
        return res.status(400).json({ error: 'Missing code or state' });
    }


    const client = await GetClient(clientLogin);
    if (client.isFailure()) {
        return res.status(404).json({ error: client.getError()?.message });
    }

    const clientData = client.getValue();

    const credentials = Buffer.from(`${clientData?.clientId}:${clientData?.clientSecret}`).toString('base64');

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
    });

    const resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!resp.ok) {
        const errorText = await resp.text();
        await SetClientAuthorizationStatus(clientLogin, false);
        return res.status(resp.status).json({ error: `Token request failed: ${errorText}` });
    }

    const tokenResponse = await resp.json() as AllegroTokenResponse;

    if (!tokenResponse.access_token) {
        await SetClientAuthorizationStatus(clientLogin, false);
        return res.status(400).json({ error: "Token response missing access_token" });
    }

    const tokenData = prepareToken(tokenResponse);

    await saveToken(clientLogin, tokenData);
    await SetClientAuthorizationStatus(clientLogin, true);
    return res.status(200).json({ message: "Authorization successful, you can close this window now." });
});

allegroAuthRouter.post("/refresh", async (req: Request, res: Response) => {
    const { client_login } = req.body;
    const result = await refreshAndSaveToken(client_login as string);
    if (result.isFailure()) {
        return res.status(400).json({ error: result.getError()?.message });
    }
    return res.status(200).json({ message: "Token refreshed successfully." });
});

export default allegroAuthRouter;