import { Router, type IRouter } from "express";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import ordersRouter from "./orders";
import productsRouter from "./products";
import bannersRouter from "./banners";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(authRouter);
router.use(dashboardRouter);
router.use(ordersRouter);
router.use(productsRouter);
router.use(bannersRouter);
router.use(categoriesRouter);

export default router;
