import { Router } from "express";
import { createAllegroClient, getAllClients } from "../controllers/allegro.clients.controller.js";

const allegroClientsRouter = Router();

allegroClientsRouter.get("/clients", getAllClients);
allegroClientsRouter.post("/create-client", createAllegroClient)

export default allegroClientsRouter;