import { Request, Response } from "express";
import User from "../models/User";
import { generateToken } from "../utils/token";
import Token from "../models/Token";
import { AuthEmail } from "../emails/AuthEmail";

export class AuthController {

    static createAccount = async (req: Request, res: Response) => {
        try {
            const { email, password, confirmPassword } = req.body

            const userExists = await User.findOne({ email })

            if (userExists) {
                return res.status(400).json({ message: "El usuario ya existe" })
            }

            if (password !== confirmPassword) {
                return res.status(400).json({ message: "Las contraseñas no coinciden" })
            }

            const user = await User.create(req.body)

            const token = new Token()
            token.token = generateToken()
            token.user = user._id

            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            await Promise.allSettled([user.save(), token.save()])
            res.send('Cuenta creada, revisa tu email para confirmarla')
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Hubo un error al crear el usuario" })
        }
    }

}