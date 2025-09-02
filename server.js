import 'dotenv/config';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Firestore, FieldValue } from "@google-cloud/firestore";

const app = express();
const PORT = process.env.PORT || 8080;
const projectId = process.env.GC_PROJECT_ID || "";
const catalogsId = process.env.FIRESTORE_DATABASE || "";

const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
const catalogs = db.collection(catalogsId);

app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const isValidNip = (nip) => /^\d{10}$/.test(String(nip || ""));

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) => res.json({ service: "catalog-api-firestore", status: "ok" }));

// GET /has-send-catalog?nip=1234567890
app.get("/has-send-catalog", async (req, res) => {
    try {
        const nip = String(req.query.nip || "");
        if (!isValidNip(nip)) return res.status(400).json({ error: "Invalid NIP (must be 10 digits)" });

        const doc = await catalogs.doc(nip).get();
        const hasSend = doc.exists ? !!doc.data().hasSend : false;
        return res.json({ nip, hasSend });
    } catch (err) {
        console.error("GET /has-send-catalog error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /send-catalog { "nip": "1234567890" }
app.post("/send-catalog", async (req, res) => {
    try {
        const nip = String(req.body.nip || "");
        if (!isValidNip(nip)) return res.status(400).json({ error: "Invalid NIP (must be 10 digits)" });

        // Idempotentny upsert: ustaw hasSend=true, aktualizuj timestampy
        await catalogs.doc(nip).set(
            {
                nip,
                hasSend: true,
                updatedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        const updated = await catalogs.doc(nip).get();
        return res.json({
            message: "Catalog marked as sent",
            nip,
            hasSend: !!updated.data().hasSend
        });
    } catch (err) {
        console.error("POST /send-catalog error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /unsend-catalog { "nip": "1234567890" }
app.post("/unsend-catalog", async (req, res) => {
    try {
        const nip = String(req.body.nip || "");
        if (!isValidNip(nip)) return res.status(400).json({ error: "Invalid NIP (must be 10 digits)" });

        await catalogs.doc(nip).set(
            {
                nip,
                hasSend: false,
                updatedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp()
            },
            { merge: true }
        );

        const updated = await catalogs.doc(nip).get();
        return res.json({
            message: "Catalog marked as unsent",
            nip,
            hasSend: !!updated.data().hasSend
        });
    } catch (err) {
        console.error("POST /unsend-catalog error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err });
    }
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}, version ${2025}`);
});
