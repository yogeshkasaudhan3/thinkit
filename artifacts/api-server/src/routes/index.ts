import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import storageRouter from "./storage";
import productsRouter from "./products";
import ordersRouter from "./orders";
import bannersRouter from "./banners";
import categoriesRouter from "./categories";
import settingsRouter from "./settings";
import vyaparImportRouter from "./admin/vyapar-import";
import imagesRouter from "./admin/images";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(bannersRouter);
router.use(categoriesRouter);
router.use(settingsRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(vyaparImportRouter);
router.use(imagesRouter);

export default router;
