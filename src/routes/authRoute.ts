import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { body } from "express-validator";
import { handleInputErrors } from "../middleware/validation";

const router: Router = Router()

router.post('/register',
    body('name').notEmpty().withMessage('El nombre es requerido').isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),
    body('lastName').notEmpty().withMessage('El apellido es requerido').isLength({ min: 3 }).withMessage('El apellido debe tener al menos 3 caracteres'),
    body('email').notEmpty().withMessage('El email es requerido').isEmail().withMessage('El email es invalido'),
    body('password').notEmpty().withMessage('La contraseña es requerida').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('confirmPassword').notEmpty().withMessage('La confirmacion de contraseña es requerida').isLength({ min: 8 }).withMessage('La confirmacion de contraseña debe tener al menos 8 caracteres'),
    body('birthdate').optional().isDate().withMessage('La fecha de nacimiento es invalida'),
    handleInputErrors,
    AuthController.createAccount
)

router.post('/confirm-account',
    body('token').notEmpty().withMessage('El token es requerido'),
    handleInputErrors,
    AuthController.confirmAccount
)

router.post('/request-code',
    body('email').isEmail().withMessage('E-mail no valido'),
    handleInputErrors,
    AuthController.requestConfirmationCode
)

router.post('/validate-token',
    body('token').notEmpty().withMessage('El Token es obligatorio'),
    handleInputErrors,
    AuthController.validateToken
)

export default router