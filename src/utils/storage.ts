import fs from 'fs/promises';
import path from 'path';

export async function saveGroupAvatar(buffer: Buffer, filename: string): Promise<string> {
    const filepath = path.join('uploads', 'group-avatars', filename);

    // Ensure the uploads/group-avatars directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    await fs.writeFile(filepath, buffer);

    return `/uploads/group-avatars/${filename}`;
}
