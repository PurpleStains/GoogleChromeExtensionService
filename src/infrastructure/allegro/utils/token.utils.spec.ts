import { Timestamp } from "@google-cloud/firestore";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AllegroTokenInternal, AllegroTokenResponse } from "../allegro.types.js";
import { isTokenExpired, prepareToken } from "./token.utils.js";

describe("token.utils", () => {
    const mockedNow = new Date("2026-04-21T12:00:00.000Z").getTime();

    beforeEach(() => {
        jest.spyOn(Date, "now").mockReturnValue(mockedNow);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("prepareToken should map access and refresh token fields", () => {
        const response: AllegroTokenResponse = {
            access_token: "access-1",
            refresh_token: "refresh-1",
            expires_in: 3600,
            allegro_api: true,
            iss: "allegro",
        };

        const result = prepareToken(response);

        expect(result.accessToken).toBe("access-1");
        expect(result.refreshToken).toBe("refresh-1");
    });

    it("prepareToken should compute expiration timestamp from expires_in", () => {
        const response: AllegroTokenResponse = {
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 120,
            allegro_api: true,
            iss: "allegro",
        };

        const result = prepareToken(response);

        const expected = new Timestamp(Math.floor((mockedNow + 120 * 1000) / 1000), 0);
        expect(result.expiresIn).toEqual(expected);
    });

    it("isTokenExpired should return true when token expiration is in the past", () => {
        const token: AllegroTokenInternal = {
            accessToken: "a",
            refreshToken: "r",
            expiresIn: new Timestamp(Math.floor(mockedNow / 1000) - 1, 0),
        };

        const result = isTokenExpired(token);

        expect(result).toBe(true);
    });

    it("isTokenExpired should return true when token expires exactly now", () => {
        const token: AllegroTokenInternal = {
            accessToken: "a",
            refreshToken: "r",
            expiresIn: new Timestamp(Math.floor(mockedNow / 1000), 0),
        };

        const result = isTokenExpired(token);

        expect(result).toBe(true);
    });

    it("isTokenExpired should return false when token expiration is in the future", () => {
        const token: AllegroTokenInternal = {
            accessToken: "a",
            refreshToken: "r",
            expiresIn: new Timestamp(Math.floor(mockedNow / 1000) + 1, 0),
        };

        const result = isTokenExpired(token);

        expect(result).toBe(false);
    });
});
