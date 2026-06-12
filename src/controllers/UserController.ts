import { Request, Response } from "express";
import User from "../models/User";
import { getSupabaseClient } from "../utils/supabase";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

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

    static uploadAvatar = async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                res.status(400).json({ message: "Se requiere un archivo" });
                return;
            }

            // Validate file size
            if (req.file.size > MAX_FILE_SIZE) {
                res.status(400).json({ message: "El archivo supera el límite de 2 MB" });
                return;
            }

            // Validate file type
            if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
                res.status(400).json({ message: "Tipo de archivo no permitido. Use JPEG, PNG o WebP" });
                return;
            }

            const user = await User.findById(req.user!._id);
            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return;
            }

            // Upload to Supabase Storage
            const supabase = getSupabaseClient();
            const timestamp = Date.now();
            const ext = req.file.originalname.split('.').pop() || 'jpg';
            const filePath = `avatars/users/${user._id}/${timestamp}.${ext}`;

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                });

            if (error) {
                console.error('Supabase upload error:', error);
                res.status(500).json({ message: "Error al subir el avatar" });
                return;
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            user.avatarUrl = urlData.publicUrl;
            await user.save();

            res.status(201).json({ avatarUrl: urlData.publicUrl });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Hubo un error al subir el avatar" });
        }
    }
}
