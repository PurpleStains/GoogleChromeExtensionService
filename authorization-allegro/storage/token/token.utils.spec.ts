import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { prepareToken, isTokenExpired } from './token.utils.js';
import { AllegroTokenResponse, AllegroTokenInternal } from '../../types/token.type.js';
import { Timestamp } from '@google-cloud/firestore';

describe('prepareToken', () => {
    const MOCK_NOW = new Date('2026-03-02T12:00:00.000Z').getTime();

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should correctly map token properties', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: 'test_access_token',
            refresh_token: 'test_refresh_token',
            expires_in: 3600,
            allegro_api: true,
            iss: 'allegro'
        };

        const result = prepareToken(tokenResponse);

        expect(result.accessToken).toBe('test_access_token');
        expect(result.refreshToken).toBe('test_refresh_token');
    });

    it('should calculate expiration date correctly for standard expiry time', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            allegro_api: true,
            iss: 'allegro'
        };

        const result = prepareToken(tokenResponse);
        const expectedExpiry = new Timestamp((MOCK_NOW / 1000) + 3600, 0);

        expect(result.expiresIn).toEqual(expectedExpiry);
    });

    it('should handle expires_in of 0 (immediate expiry)', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 0,
            allegro_api: true,
            iss: 'allegro'
        };

        const result = prepareToken(tokenResponse);
        const expectedExpiry = new Timestamp((MOCK_NOW / 1000), 0);

        expect(result.expiresIn).toEqual(expectedExpiry);
    });

    it('should handle large expires_in value', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 86400, // 24 hours
            allegro_api: true,
            iss: 'allegro'
        };

        const result = prepareToken(tokenResponse);
        const expectedExpiry = new Timestamp((MOCK_NOW / 1000) + 86400, 0);

        expect(result.expiresIn).toEqual(expectedExpiry);
    });

    it('should handle negative expires_in value', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: -3600,
            allegro_api: true,
            iss: 'allegro'
        };

        const result = prepareToken(tokenResponse);
        const expectedExpiry = new Timestamp((MOCK_NOW / 1000) - 3600, 0);

        expect(result.expiresIn).toEqual(expectedExpiry);
    });

    it('should handle empty string tokens', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: '',
            refresh_token: '',
            expires_in: 3600,
            allegro_api: true,
            iss: 'allegro'
        };

        const result = prepareToken(tokenResponse);

        expect(result.accessToken).toBe('');
        expect(result.refreshToken).toBe('');
    });

    it('should return new Date object for each call', () => {
        const tokenResponse: AllegroTokenResponse = {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
            allegro_api: true,
            iss: 'allegro'
        };

        const result1 = prepareToken(tokenResponse);
        const result2 = prepareToken(tokenResponse);

        expect(result1.expiresIn).not.toBe(result2.expiresIn);
        expect(result1.expiresIn).toEqual(result2.expiresIn);
    });
});

describe('isTokenExpired', () => {
    it('should return false for a token that is expired', () => {
        const date = new Date().getTime();
        console.log('Current time in seconds:', date / 1000);
        const futureDate = new Timestamp(Math.floor(new Date().getTime() / 1000 - 3600), 0); // 1 hour in the future
        const token: AllegroTokenInternal = {
            accessToken: 'token',
            refreshToken: 'refresh',
            expiresIn: futureDate
        };

        const result = isTokenExpired(token);
        expect(result).toBe(true);
    });

    it('should return true for a token that is expired', () => {
        const pastDate = new Timestamp((Math.floor(new Date().getTime() / 1000)) + 3600, 0); // 1 hour in the past
        const token: AllegroTokenInternal = {
            accessToken: 'token',
            refreshToken: 'refresh',
            expiresIn: pastDate
        };

        const result = isTokenExpired(token);
        expect(result).toBe(false);
    });

    it('should return true for a token that expires exactly at the current time', () => {
        const now = new Timestamp(Math.floor(new Date().getTime() / 1000), 0);
        const token: AllegroTokenInternal = {
            accessToken: 'token',
            refreshToken: 'refresh',
            expiresIn: now
        };
        const result = isTokenExpired(token);
        expect(result).toBe(true);
    });
})
