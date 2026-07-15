import { Router, type IRouter } from "express";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import ordersRouter from "./orders";
import productsRouter from "./products";
import productVariantsRouter from "./product-variants";
import bannersRouter from "./banners";
import categoriesRouter from "./categories";
import settingsRouter from "./settings";
import inventorySyncRouter from "./inventory-sync";
import subcategoriesRouter from "./subcategories";
import passwordResetRequestsRouter from "./password-reset-requests";

const router: IRouter = Router();

router.use(authRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(ordersRouter);
router.use(productsRouter);
router.use(productVariantsRouter);
router.use(bannersRouter);
router.use(categoriesRouter);
router.use(subcategoriesRouter);
router.use(settingsRouter);
router.use(inventorySyncRouter);
router.use(passwordResetRequestsRouter);

export default router;
