import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate, requireCompleteProfile } from "../middleware/auth";
import { handleInputErrors } from "../middleware/validation";
import { body } from "express-validator";
import multer from "multer";

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Proteger todas las rutas de usuarios
router.use(authenticate());
router.use(requireCompleteProfile);

// Obtener perfil
router.get("/profile", UserController.getUserProfile);

// Actualizar perfil
router.put(
    "/profile",
    body("name").notEmpty().withMessage("El nombre es obligatorio").isString(),
    body("lastName").notEmpty().withMessage("El apellido es obligatorio").isString(),
    body("birthdate").optional().isISO8601().withMessage("Fecha de nacimiento no válida"),
    handleInputErrors,
    UserController.updateUserProfile
);

// Subir avatar
router.post(
    "/avatar",
    upload.single("avatar"),
    UserController.uploadAvatar
);

export default router;
