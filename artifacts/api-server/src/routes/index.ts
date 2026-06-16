import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import productsRouter from "./products";
import adminsRouter from "./admins";
import storageRouter from "./storage";
import promosRouter from "./promos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ordersRouter);
router.use(paymentsRouter);
router.use(productsRouter);
router.use(adminsRouter);
router.use(storageRouter);
router.use(promosRouter);

export default router;
