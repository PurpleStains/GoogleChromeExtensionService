import { Router, Request, Response } from "express";
import crypto from "crypto";

const allegroAuthRouter = Router();
const AUTH_URL = "https://allegro.pl/auth/oauth/authorize";
const TOKEN_URL = "https://allegro.pl/auth/oauth/token";
const REDIRECT_URI = process.env.NODE_ENV === 'production'
    ? "https://peaksell-ui-163413146123.europe-west1.run.app/callback"
    : "http://localhost:3000/callback";

const codeVerifiers = new Map<string, string>();

const base64UrlEncode = (buffer: Buffer): string => {
    const base64 = buffer.toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const generateCodeVerifier = (): string => {
    const buffer = crypto.randomBytes(96);
    return base64UrlEncode(buffer);
}

const generateCodeChallenge = (verifier: string): string => {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
}

allegroAuthRouter.get("/authorize", async (req: Request, res: Response) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    codeVerifiers.set(state, codeVerifier);

    const url = new URL(AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', process.env.CLIENT_ID ?? "");
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', state);

    res.redirect(url.toString());
});

allegroAuthRouter.get("/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        return res.status(400).json({ error: 'Missing code or state' });
    }

    const codeVerifier = codeVerifiers.get(state);
    if (!codeVerifier) {
        return res.status(400).json({ error: 'Invalid state' });
    }

    codeVerifiers.delete(state);

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
        client_id: process.env.CLIENT_ID ?? "",
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

    const json = await resp.json() as any;

    if (!json.access_token) {
        return res.status(400).json({ error: `Token response missing access_token: ${JSON.stringify(json)}` });
    }

    return res.json(json);
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