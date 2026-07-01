import { Router, type IRouter } from "express";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import ordersRouter from "./orders";
import productsRouter from "./products";
import bannersRouter from "./banners";
import categoriesRouter from "./categories";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(authRouter);
router.use(dashboardRouter);
router.use(ordersRouter);
router.use(productsRouter);
router.use(bannersRouter);
router.use(categoriesRouter);
router.use(settingsRouter);

export default router;
