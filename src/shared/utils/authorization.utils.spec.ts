import { base64UrlEncode, generateCodeVerifier, generateCodeChallenge } from './authorization.utils.js';
import crypto from 'crypto';
import { describe, it, expect } from '@jest/globals';

describe('Authorization Utils', () => {
    describe('base64UrlEncode', () => {
        it('should encode buffer to base64url format', () => {
            const buffer = Buffer.from('test');
            const result = base64UrlEncode(buffer);
            expect(result).toBe('dGVzdA');
        });

        it('should replace + with -', () => {
            const buffer = Buffer.from([251, 239]); // produces + in base64
            const result = base64UrlEncode(buffer);
            expect(result).not.toContain('+');
            expect(result).toContain('-');
        });

        it('should replace / with _', () => {
            const buffer = Buffer.from([255, 254]); // produces / in base64
            const result = base64UrlEncode(buffer);
            expect(result).not.toContain('/');
            expect(result).toContain('_');
        });

        it('should remove trailing = padding', () => {
            const buffer = Buffer.from('a');
            const result = base64UrlEncode(buffer);
            expect(result).not.toContain('=');
        });

        it('should handle empty buffer', () => {
            const buffer = Buffer.from('');
            const result = base64UrlEncode(buffer);
            expect(typeof result).toBe('string');
            expect(result.length).toBe(0);
        });

        it('should handle large buffer', () => {
            const buffer = crypto.randomBytes(256);
            const result = base64UrlEncode(buffer);
            expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
        });
    });

    describe('generateCodeVerifier', () => {
        it('should return a string', () => {
            const verifier = generateCodeVerifier();
            expect(typeof verifier).toBe('string');
        });

        it('should generate 128 character string (96 bytes base64url encoded)', () => {
            const verifier = generateCodeVerifier();
            expect(verifier.length).toBe(128);
        });

        it('should only contain valid base64url characters', () => {
            const verifier = generateCodeVerifier();
            expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('should generate different verifiers on each call', () => {
            const verifier1 = generateCodeVerifier();
            const verifier2 = generateCodeVerifier();
            expect(verifier1).not.toBe(verifier2);
        });

        it('should not contain padding characters', () => {
            const verifier = generateCodeVerifier();
            expect(verifier).not.toContain('=');
        });
    });

    describe('generateCodeChallenge', () => {
        it('should generate consistent challenge for same verifier', () => {
            const verifier = 'test-verifier-123';
            const challenge1 = generateCodeChallenge(verifier);
            const challenge2 = generateCodeChallenge(verifier);
            expect(challenge1).toBe(challenge2);
        });

        it('should generate different challenges for different verifiers', () => {
            const challenge1 = generateCodeChallenge('verifier1');
            const challenge2 = generateCodeChallenge('verifier2');
            expect(challenge1).not.toBe(challenge2);
        });

        it('should return valid base64url formatted string', () => {
            const challenge = generateCodeChallenge('test');
            expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        it('should not contain padding characters', () => {
            const challenge = generateCodeChallenge('test-verifier');
            expect(challenge).not.toContain('=');
        });

        it('should handle empty verifier', () => {
            const challenge = generateCodeChallenge('');
            expect(typeof challenge).toBe('string');
            expect(challenge.length).toBeGreaterThan(0);
        });

        it('should generate 43-character SHA256 hash in base64url', () => {
            const challenge = generateCodeChallenge('test');
            expect(challenge.length).toBe(43);
        });

        it('should handle long verifier string', () => {
            const longVerifier = generateCodeVerifier();
            const challenge = generateCodeChallenge(longVerifier);
            expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
        });
    });
});