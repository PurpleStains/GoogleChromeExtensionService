import { Router } from "express";
import { fetchCustomersMessages } from "../controllers/allegro.messages.controller.js";

const allegroCustomerMessagesRouter = Router();

allegroCustomerMessagesRouter.get("/messages", fetchCustomersMessages);

export default allegroCustomerMessagesRouter;