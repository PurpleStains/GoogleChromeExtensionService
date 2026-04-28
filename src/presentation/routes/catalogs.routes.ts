import { Router } from "express";
import { hasSendCatalog, sendCatalog, unsendCatalog, getAllCatalogs } from "../controllers/catalogs.controller.js";

const catalogsRouter = Router();

catalogsRouter.get("/has-send-catalog", hasSendCatalog);
catalogsRouter.post("/send-catalog", sendCatalog);
catalogsRouter.post("/unsend-catalog", unsendCatalog);
catalogsRouter.get("/catalogs", getAllCatalogs);

export default catalogsRouter;
