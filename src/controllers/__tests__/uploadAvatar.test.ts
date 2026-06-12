import { vi, describe, it, expect, beforeEach } from 'vitest'
import { UserController } from '../../controllers/UserController'
import User from '../../models/User'
import { getSupabaseClient } from '../../utils/supabase'
import { buildMockRequest, buildMockResponse } from '../../__tests__/helpers/mockHelpers'
import { Types } from 'mongoose'
import { Readable } from 'stream'

// Mock User model
vi.mock('../../models/User', () => ({
  default: {
    findById: vi.fn(),
  },
}))

// Mock Supabase client
vi.mock('../../utils/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('UserController.uploadAvatar', () => {
  beforeEach(() => {
    vi.mocked(User.findById).mockReset()
    vi.mocked(getSupabaseClient).mockReset()
  })

  describe('when valid image file is uploaded', () => {
    it('returns 201 with avatarUrl', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        profileComplete: true,
        avatarUrl: undefined,
        save: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(User.findById).mockResolvedValue(mockUser as any)

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'avatars/users/123/1234567890.jpg' },
        error: null,
      })
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/avatars/users/123/1234567890.jpg' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        storage: {
          from: vi.fn().mockReturnValue({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          }),
        },
      } as any)

      const fileBuffer = Buffer.from('fake-image-data')
      const req = buildMockRequest({
        user: { _id: mockUser._id } as any,
        file: {
          buffer: fileBuffer,
          originalname: 'photo.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        } as any,
      })
      const res = buildMockResponse()

      await UserController.uploadAvatar(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        avatarUrl: 'https://example.com/avatars/users/123/1234567890.jpg',
      })
      expect(mockUser.avatarUrl).toBe('https://example.com/avatars/users/123/1234567890.jpg')
      expect(mockUser.save).toHaveBeenCalled()
    })
  })

  describe('when no file is uploaded', () => {
    it('returns 400 with file required message', async () => {
      const req = buildMockRequest({
        user: { _id: new Types.ObjectId() } as any,
        file: undefined,
      })
      const res = buildMockResponse()

      await UserController.uploadAvatar(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Se requiere un archivo',
      })
    })
  })

  describe('when file exceeds 2MB', () => {
    it('returns 400 with size limit message', async () => {
      const req = buildMockRequest({
        user: { _id: new Types.ObjectId() } as any,
        file: {
          buffer: Buffer.alloc(3 * 1024 * 1024), // 3MB
          originalname: 'large.jpg',
          mimetype: 'image/jpeg',
          size: 3 * 1024 * 1024,
        } as any,
      })
      const res = buildMockResponse()

      await UserController.uploadAvatar(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'El archivo supera el límite de 2 MB',
      })
    })
  })

  describe('when file type is not allowed', () => {
    it('returns 400 with invalid type message', async () => {
      const req = buildMockRequest({
        user: { _id: new Types.ObjectId() } as any,
        file: {
          buffer: Buffer.from('fake-data'),
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        } as any,
      })
      const res = buildMockResponse()

      await UserController.uploadAvatar(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tipo de archivo no permitido. Use JPEG, PNG o WebP',
      })
    })
  })

  describe('when user is not found', () => {
    it('returns 404', async () => {
      vi.mocked(User.findById).mockResolvedValue(null)

      const req = buildMockRequest({
        user: { _id: new Types.ObjectId() } as any,
        file: {
          buffer: Buffer.from('fake-data'),
          originalname: 'photo.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        } as any,
      })
      const res = buildMockResponse()

      await UserController.uploadAvatar(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuario no encontrado',
      })
    })
  })

  describe('when Supabase upload fails', () => {
    it('returns 500 with upload error', async () => {
      const mockUser = {
        _id: new Types.ObjectId(),
        profileComplete: true,
        save: vi.fn().mockResolvedValue(true),
      }
      vi.mocked(User.findById).mockResolvedValue(mockUser as any)

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      })
      vi.mocked(getSupabaseClient).mockReturnValue({
        storage: {
          from: vi.fn().mockReturnValue({
            upload: mockUpload,
          }),
        },
      } as any)

      const req = buildMockRequest({
        user: { _id: mockUser._id } as any,
        file: {
          buffer: Buffer.from('fake-data'),
          originalname: 'photo.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        } as any,
      })
      const res = buildMockResponse()

      await UserController.uploadAvatar(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error al subir el avatar',
      })
    })
  })
})
