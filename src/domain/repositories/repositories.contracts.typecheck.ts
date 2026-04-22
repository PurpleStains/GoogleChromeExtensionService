import { Result } from "../../shared/patterns/result-pattern.js";
import { ClientData, ClientsResponse, AllegroTokenInternal } from "../../infrastructure/allegro/allegro.types.js";
import { IClientsRepository } from "./clients.repository.js";
import { ITokensRepository } from "./tokens.repository.js";
import { FirestoreClientsRepository } from "../../infrastructure/allegro/repositories/firestore-clients.repository.js";
import { FirestoreTokensRepository } from "../../infrastructure/allegro/repositories/firestore-tokens.repository.js";

type Assert<T extends true> = T;
type IsAssignable<T, U> = T extends U ? true : false;

// Implementation-level contract checks.
type ClientsRepositoryImplementsContract = Assert<
    IsAssignable<FirestoreClientsRepository, IClientsRepository>
>;

type TokensRepositoryImplementsContract = Assert<
    IsAssignable<FirestoreTokensRepository, ITokensRepository>
>;

// Method signature-level checks.
type ClientsFindByLoginSignature = Assert<
    IsAssignable<
        IClientsRepository["findByLogin"],
        (allegroLogin: string) => Promise<Result<ClientData>>
    >
>;

type ClientsFindAllSignature = Assert<
    IsAssignable<
        IClientsRepository["findAllWithAuthorizationStatus"],
        () => Promise<Result<ClientsResponse>>
    >
>;

type ClientsCreateSignature = Assert<
    IsAssignable<
        IClientsRepository["create"],
        (client: ClientData) => Promise<Result<ClientData>>
    >
>;

type ClientsUpdateAuthorizationSignature = Assert<
    IsAssignable<
        IClientsRepository["updateAuthorizationStatus"],
        (clientLogin: string, isAuthorized: boolean) => Promise<Result<void>>
    >
>;

type TokensClearSignature = Assert<
    IsAssignable<
        ITokensRepository["clear"],
        () => Promise<Result<void>>
    >
>;

type TokensFindByClientLoginSignature = Assert<
    IsAssignable<
        ITokensRepository["findByClientLogin"],
        (clientLogin: string) => Promise<Result<AllegroTokenInternal>>
    >
>;

type TokensSaveSignature = Assert<
    IsAssignable<
        ITokensRepository["save"],
        (clientLogin: string, token: AllegroTokenInternal) => Promise<Result<void>>
    >
>;

void (0 as unknown as
    | ClientsRepositoryImplementsContract
    | TokensRepositoryImplementsContract
    | ClientsFindByLoginSignature
    | ClientsFindAllSignature
    | ClientsCreateSignature
    | ClientsUpdateAuthorizationSignature
    | TokensClearSignature
    | TokensFindByClientLoginSignature
    | TokensSaveSignature);
