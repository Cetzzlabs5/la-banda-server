import { Router } from "express";
import { GroupController } from "../controllers/GroupController";
import { authenticate, requireCompleteProfile } from "../middleware/auth";
import { handleInputErrors } from "../middleware/validation";
import { body } from "express-validator";
import { upload } from "../middleware/upload";

const router: Router = Router();

router.post('/',
    authenticate(),
    requireCompleteProfile,
    upload.single('photo'),
    body('name')
        .matches(/^[a-zA-Z0-9\s-]{3,40}$/)
        .withMessage('El nombre debe tener entre 3 y 40 caracteres alfanuméricos, espacios y guiones'),
    body('type')
        .isIn(['OPEN', 'CLOSED'])
        .withMessage('El tipo debe ser OPEN o CLOSED'),
    body('description')
        .optional()
        .isLength({ max: 120 })
        .withMessage('La descripción no puede superar los 120 caracteres'),
    handleInputErrors,
    GroupController.createGroup
);

export default router;
