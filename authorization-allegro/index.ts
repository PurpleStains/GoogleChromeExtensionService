import { Router, Request, Response } from "express";
import { generateCodeChallenge, generateCodeVerifier } from "./utils/authorization.utils.js";
import crypto from "crypto";
import { GetClient } from "./storage/clients/clients-storage.js";
import { AllegroTokenResponse } from "./types/token.type.js";

const allegroAuthRouter = Router();
const AUTH_URL = "https://allegro.pl/auth/oauth/authorize";
const TOKEN_URL = "https://allegro.pl/auth/oauth/token";
const REDIRECT_URI = process.env.NODE_ENV === 'production'
    ? "https://peaksell-ui-163413146123.europe-west1.run.app/callback"
    : "http://localhost:3000/allegro/callback";

allegroAuthRouter.get("/authorize", async (req: Request, res: Response) => {
    const { client_login } = req.query;
    const result = await GetClient(client_login as string);

    if (result.isFailure()) {
        return res.status(404).json({ error: result.getError()?.message });
    }

    const clientDetails = result.getValue();

    const codeVerifier = generateCodeVerifier();
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

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: clientData?.clientId ?? "",
    });

    const resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!resp.ok) {
        const errorText = await resp.text();
        return res.status(resp.status).json({ error: `Token request failed: ${errorText}` });
    }

    const json = await resp.json() as AllegroTokenResponse;

    if (!json.access_token) {
        return res.status(400).json({ error: "Token response missing access_token" });
    }

    return res.status(200).json({ message: "Authorization successful, you can close this window now." });
});

allegroAuthRouter.post("/refresh", async (req: Request, res: Response) => {
    const { refresh_token } = req.body;

    const credentials = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
    });

    const r = await fetch("https://allegro.pl/auth/oauth/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);

    res.type("application/json").send(text);
});

export default allegroAuthRouter;