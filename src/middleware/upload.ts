import multer from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024, // 2 MB
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Use JPEG, PNG o WebP'));
        }
    },
});
