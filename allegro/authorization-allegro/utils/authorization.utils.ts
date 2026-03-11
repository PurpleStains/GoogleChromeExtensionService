import crypto from 'crypto';

export const base64UrlEncode = (buffer: Buffer): string => {
    const base64 = buffer.toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const generateCodeVerifier = (): string => {
    const buffer = crypto.randomBytes(96);
    return base64UrlEncode(buffer);
}

export const generateCodeChallenge = (verifier: string): string => {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
}