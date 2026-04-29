import 'dotenv/config';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { logger } from './src/shared/logger.js';
import { globalErrorMiddleware } from './src/presentation/middleware/error.middleware.js';
import { clearTokens } from './src/infrastructure/allegro/repositories/firestore-tokens.repository.js';
import allegroClientsRouter from './src/presentation/routes/allegro.clients.routes.js';
import allegroAuthRouter from './src/presentation/routes/allegro.auth.routes.js';
import allegroCustomerMessagesRouter from './src/presentation/routes/allegro.messages.routes.js';
import catalogsRouter from './src/presentation/routes/catalogs.routes.js';

const app = express();
const PORT = process.env.PORT || 8080;

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
const morganStream = { write: (msg: string) => logger.http(msg.trim()) };
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", { stream: morganStream }));

app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/", (_req, res) => res.json({ service: "catalog-api-firestore", status: "ok" }));

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
app.use("/", catalogsRouter)

app.use(globalErrorMiddleware);

app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
});


