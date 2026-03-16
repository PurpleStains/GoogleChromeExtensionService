import { Router, } from "express";
import { allegroAuthCallback, allegroAuthorize, allegroRefreshToken } from "../controllers/allegro.auth.controller.js";

const allegroAuthRouter = Router();

allegroAuthRouter.get("/authorize", allegroAuthorize);

allegroAuthRouter.get("/callback", allegroAuthCallback);

allegroAuthRouter.post("/refresh", allegroRefreshToken);

export default allegroAuthRouter;