import { Request, Response } from "express";
import { catalogsService } from "../../application/services/catalogs.service.js";

const isValidNip = (nip: string) => /^\d{10}$/.test(String(nip || ""));

export const hasSendCatalog = async (req: Request, res: Response) => {
    const nip = String(req.query.nip || "");
    if (!isValidNip(nip)) return res.status(200).json({ error: "Invalid NIP (must be 10 digits)" });

    const result = await catalogsService.getCatalogByNip(nip);
    if (result.isFailure()) return res.status(500).json({ error: "Internal Server Error" });

    const catalog = result.getValue();
    return res.json({ nip, hasSend: catalog ? !!catalog.hasSend : false });
};

export const sendCatalog = async (req: Request, res: Response) => {
    const nip = String(req.body.nip || "");
    if (!isValidNip(nip)) return res.status(200).json({ error: "Invalid NIP (must be 10 digits)" });

    const result = await catalogsService.markAsSent(nip);
    if (result.isFailure()) return res.status(500).json({ error: "Internal Server Error" });

    const catalog = result.getValue();
    return res.json({ message: "Catalog marked as sent", nip, hasSend: !!catalog?.hasSend });
};

export const unsendCatalog = async (req: Request, res: Response) => {
    const nip = String(req.body.nip || "");
    if (!isValidNip(nip)) return res.status(200).json({ error: "Invalid NIP (must be 10 digits)" });

    const result = await catalogsService.markAsUnsent(nip);
    if (result.isFailure()) return res.status(500).json({ error: "Internal Server Error", details: result.getError() });

    const catalog = result.getValue();
    return res.json({ message: "Catalog marked as unsent", nip, hasSend: !!catalog?.hasSend });
};

export const getAllCatalogs = async (_req: Request, res: Response) => {
    const result = await catalogsService.getAllCatalogs();
    if (result.isFailure()) return res.status(500).json({ error: "Internal Server Error" });

    const catalogs = result.getValue() ?? [];
    return res.json({ count: catalogs.length, catalogs });
};
