import { Request, Response } from "express";
import Group from "../models/Group";
import User, { MembershipRole } from "../models/User";
import { saveGroupAvatar } from "../utils/storage";
import { generateSlug } from "../utils/slug";
import { generateInviteCode } from "../utils/code";
import sharp from "sharp";
import path from "path";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const NAME_REGEX = /^[a-zA-Z0-9\s-]{3,40}$/;

async function getUniqueSlug(name: string): Promise<string> {
    const maxRetries = 10;
    let retries = 0;
    let slug: string;
    let exists = true;

    while (exists && retries < maxRetries) {
        slug = generateSlug(name);
        const existing = await Group.findOne({ slug });
        exists = !!existing;
        retries++;
    }

    if (exists) {
        throw new Error('No se pudo generar un slug único después de múltiples intentos');
    }

    return slug!;
}

async function getUniqueInviteCode(): Promise<string> {
    const maxRetries = 10;
    let retries = 0;
    let code: string;
    let exists = true;

    while (exists && retries < maxRetries) {
        code = generateInviteCode();
        const existing = await Group.findOne({ inviteCode: code });
        exists = !!existing;
        retries++;
    }

    if (exists) {
        throw new Error('No se pudo generar un código de invitación único después de múltiples intentos');
    }

    return code!;
}

export class GroupController {
    static createGroup = async (req: Request, res: Response) => {
        try {
            const userId = req.user!._id;

            // Validate name
            if (!NAME_REGEX.test(req.body.name)) {
                res.status(400).json({ message: "El nombre debe tener entre 3 y 40 caracteres alfanuméricos, espacios y guiones" });
                return;
            }

            // Validate type
            if (!['OPEN', 'CLOSED'].includes(req.body.type)) {
                res.status(400).json({ message: "El tipo debe ser OPEN o CLOSED" });
                return;
            }

            // Validate description
            if (req.body.description && req.body.description.length > 120) {
                res.status(400).json({ message: "La descripción no puede superar los 120 caracteres" });
                return;
            }

            // Check leader limit
            const user = await User.findById(userId);
            if (!user) {
                res.status(404).json({ message: "Usuario no encontrado" });
                return;
            }

            const leaderCount = user.memberships.filter(
                (m) => m.role === MembershipRole.LEADER
            ).length;

            if (leaderCount >= 3) {
                res.status(403).json({ message: "No podés liderar más de 3 grupos" });
                return;
            }

            // Check duplicate name (case-insensitive exact match)
            const escapedName = req.body.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existingGroup = await Group.findOne({
                name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
            });

            if (existingGroup) {
                res.status(409).json({ message: "Ya existe un grupo con ese nombre" });
                return;
            }

            // Process optional photo
            let avatarUrl: string | undefined;
            if (req.file) {
                if (req.file.size > MAX_FILE_SIZE) {
                    res.status(400).json({ message: "El archivo supera el límite de 2 MB" });
                    return;
                }

                const resizedBuffer = await sharp(req.file.buffer)
                    .resize(512, 512, { fit: 'cover' })
                    .toBuffer();

                const ext = path.extname(req.file.originalname) || '.jpg';
                const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
                avatarUrl = await saveGroupAvatar(resizedBuffer, filename);
            }

            // Generate unique slug and invite code
            const slug = await getUniqueSlug(req.body.name);
            const inviteCode = await getUniqueInviteCode();

            // Create group with leader membership
            const group = new Group({
                name: req.body.name,
                slug,
                type: req.body.type,
                description: req.body.description,
                inviteCode,
                leader: userId,
                avatarUrl,
                memberships: [{ user: userId, role: MembershipRole.LEADER }]
            });

            await group.save();

            // Update user memberships
            user.memberships.push({ group: group._id, role: MembershipRole.LEADER });

            try {
                await user.save();
            } catch (error) {
                await group.deleteOne();
                throw error;
            }

            res.status(201).json(group);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Hubo un error al crear el grupo" });
        }
    };
}
