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

    static confirmAccount = async (req: Request, res: Response) => {
        try {
            const { token } = req.body

            const tokenExists = await Token.findOne({ token })

            if (!tokenExists) {
                const error = new Error('Token no valido')
                res.status(404).json({ message: error.message })
                return
            }

            const user = await User.findById(tokenExists.user)

            if (!user) {
                const error = new Error('Usuario no encontrado')
                res.status(404).json({ message: error.message })
                return
            }

            user.isActive = true

            await Promise.allSettled([user.save(), tokenExists.deleteOne()])
            res.send('Cuanta confirmada correctamente')

        } catch (error) {
            res.status(500).json({ message: 'Hubo un error' })

        }
    }

    static requestConfirmationCode = async (req: Request, res: Response) => {
        try {
            const { email } = req.body

            // Usuario exist
            const user = await User.findOne({ email })

            if (!user) {
                const error = new Error('El Usuario no esta registrado')
                res.status(404).json({ error: error.message })
                return
            }

            if (user.isActive) {
                const error = new Error('El Usuario ya esta confirmado')
                res.status(403).json({ error: error.message })
                return
            }

            // Generar token
            const token = new Token()
            token.token = generateToken()
            token.user = user._id

            // Enviar email
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            await Promise.allSettled([user.save(), token.save()])
            res.send('Se envio un nuevo token a tu email')
        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static validateToken = async (req: Request, res: Response) => {
        try {
            const { token } = req.body

            const tokenExists = await Token.findOne({ token })

            if (!tokenExists) {
                const error = new Error('Token no valido')
                res.status(404).json({ message: error.message })
                return
            }

            res.send('Token valido, define tu nueva contraseña')

        } catch {
            res.status(500).json({ message: 'Hubo un error' })

        }
    }

}