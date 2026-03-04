import { Request, Response } from "express";
import User from "../models/User";

export class UserController {
    static getUserProfile = async (req: Request, res: Response) => {
        try {
            // El usuario ya fue inyectado por el middleware 'authenticate'
            const user = await User.findById(req.user!._id).select("-password -__v");

            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Hubo un error al obtener el perfil" });
        }
    }

    static updateUserProfile = async (req: Request, res: Response) => {
        try {
            const { name, lastName, birthdate } = req.body;

            // Buscamos el documento original para mantener las referencias de Mongoose si hubieran hooks futuros
            const user = await User.findById(req.user!._id);
            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return;
            }

            user.name = name;
            user.lastName = lastName;

            if (birthdate) {
                user.birthdate = new Date(birthdate);
            }

            await user.save();

            res.send("Perfil actualizado correctamente");
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Hubo un error al actualizar el perfil" });
        }
    }
}
