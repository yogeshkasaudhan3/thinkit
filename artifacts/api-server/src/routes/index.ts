import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import storageRouter from "./storage";
import productsRouter from "./products";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;
