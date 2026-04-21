import 'dotenv/config';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { clearTokens } from './src/infrastructure/allegro/repositories/firestore-tokens.repository.js';
import allegroClientsRouter from './src/presentation/routes/allegro.clients.routes.js';
import allegroAuthRouter from './src/presentation/routes/allegro.auth.routes.js';
import allegroCustomerMessagesRouter from './src/presentation/routes/allegro.messages.routes.js';

const app = express();
const PORT = process.env.PORT || 8080;
const projectId = process.env.GC_PROJECT_ID || "";
const catalogsId = process.env.FIRESTORE_DATABASE || "";

const db = new Firestore({ projectId: projectId, databaseId: catalogsId });
const catalogs = db.collection(catalogsId);

const allowedOrigins = [
    "chrome-extension://*",
    "http://localhost:3000",
    "http://localhost:8080",
    "https://panel-g.baselinker.com*",
    "*"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // non-browser clients (e.g. curl)
        if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("CORS policy: origin not allowed"));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));
app.options("*", cors({ origin: true, credentials: false }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const isValidNip = (nip: string) => /^\d{10}$/.test(String(nip || ""));

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) => res.json({ service: "catalog-api-firestore", status: "ok" }));

// GET /has-send-catalog?nip=1234567890
app.get("/has-send-catalog", async (req, res) => {
    try {
        const nip = String(req.query.nip || "");
        if (!isValidNip(nip)) return res.status(200).json({ error: "Invalid NIP (must be 10 digits)" });

        const doc = await catalogs.doc(nip).get();
        const hasSend = doc.exists ? !!doc.data()?.hasSend : false;
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
        if (!isValidNip(nip)) return res.status(200).json({ error: "Invalid NIP (must be 10 digits)" });

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
            hasSend: !!updated?.data()?.hasSend
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
        if (!isValidNip(nip)) return res.status(200).json({ error: "Invalid NIP (must be 10 digits)" });

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
            hasSend: !!updated?.data()?.hasSend
        });
    } catch (err) {
        console.error("POST /unsend-catalog error:", err);
        return res.status(500).json({ error: "Internal Server Error", details: err });
    }
})

// GET /catalogs
app.get("/catalogs", async (req, res) => {
    try {
        const snapshot = await catalogs.get();
        const allCatalogs: any[] = [];

        snapshot.forEach(doc => {
            allCatalogs.push({
                nip: doc.id,
                ...doc.data()
            });
        });

        return res.json({
            count: allCatalogs.length,
            catalogs: allCatalogs
        });
    } catch (err) {
        console.error("GET /catalogs error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.delete("/clear-tokens", async (_req, res) => {
    const result = await clearTokens();
    if (result.isFailure()) {
        return res.status(500).json({ error: "Failed to clear tokens", details: result.getError()?.message });
    }
    return res.status(200).json({ message: "Tokens cleared successfully" });
});


app.use("/allegro", allegroAuthRouter)
app.use("/allegro-client", allegroClientsRouter)
app.use("/allegro-messages", allegroCustomerMessagesRouter)

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});


