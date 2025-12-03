import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model';
import BookModel from '../models/book.model';
import {
  registerUser,
  loginUser,
  getUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
  disableUser,
  getUserReservations,
} from '../controllers/user.controller';
import { AuthRequest } from '../middlewares/auth.middleware';

// Mock de bcryptjs y jsonwebtoken
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

// Mock de los modelos
jest.mock('../models/user.model');
jest.mock('../models/book.model');

describe('User Controller', () => {
  let mockRequest: Partial<Request | AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          nombre: 'Juan Pérez',
          email: 'juan@test.com',
          password: 'password123',
        },
      };
    });

    it('debe registrar un usuario exitosamente', async () => {
      (UserModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
      (bcrypt.hash as jest.Mock) = jest.fn().mockResolvedValue('hashedPassword');
      (UserModel.create as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Pérez',
        email: 'juan@test.com',
        password: 'hashedPassword',
        enabled: true,
        roles: ['USER'],
        reservas: [],
      });

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Usuario registrado',
        resultado: {
          id: '507f1f77bcf86cd799439011',
          email: 'juan@test.com',
          nombre: 'Juan Pérez',
        },
      });
    });

    it('debe fallar cuando faltan datos', async () => {
      mockRequest.body = { nombre: 'Juan Pérez' };

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Datos incompletos',
      });
    });

    it('debe fallar cuando el email ya está registrado', async () => {
      (UserModel.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'juan@test.com',
      });

      await registerUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'El email ya está registrado',
      });
    });
  });

  describe('loginUser', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          email: 'juan@test.com',
          password: 'password123',
        },
      };
    });

    it('debe hacer login exitosamente', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'juan@test.com',
        password: 'hashedPassword',
        enabled: true,
        roles: ['USER'],
        toString: () => '507f1f77bcf86cd799439011',
      };

      (UserModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      (jwt.sign as jest.Mock) = jest.fn().mockReturnValue('mockToken');
      process.env.JWT_SECRET = 'test-secret';

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login exitoso',
        resultado: { token: 'mockToken' },
      });
    });

    it('debe fallar cuando faltan credenciales', async () => {
      mockRequest.body = { email: 'juan@test.com' };

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Faltan credenciales',
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      (UserModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Credenciales inválidas',
      });
    });

    it('debe fallar cuando el usuario está deshabilitado', async () => {
      (UserModel.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'juan@test.com',
        enabled: false,
      });

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Credenciales inválidas',
      });
    });

    it('debe fallar cuando la contraseña es incorrecta', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'juan@test.com',
        password: 'hashedPassword',
        enabled: true,
      };

      (UserModel.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(false);

      await loginUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Credenciales inválidas',
      });
    });
  });

  describe('getUser / getUserById', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439011' },
      } as AuthRequest;
    });

    it('debe obtener un usuario exitosamente', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Pérez',
        email: 'juan@test.com',
        enabled: true,
        roles: ['USER'],
        reservas: [],
      };

      (UserModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await getUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Usuario encontrado',
        resultado: mockUser,
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      (UserModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await getUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });

    it('debe fallar cuando el usuario está deshabilitado', async () => {
      (UserModel.findById as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          enabled: false,
        }),
      });

      await getUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });
  });

  describe('getUsers', () => {
    beforeEach(() => {
      mockRequest = {
        query: { page: '1', limit: '10' },
      } as AuthRequest;
    });

    it('debe obtener lista de usuarios exitosamente', async () => {
      const mockUsers = [
        { _id: '507f1f77bcf86cd799439011', nombre: 'Juan Pérez', email: 'juan@test.com' },
        { _id: '507f1f77bcf86cd799439012', nombre: 'María García', email: 'maria@test.com' },
      ];

      (UserModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(2);
      (UserModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockUsers),
          }),
        }),
      });

      await getUsers(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Lista de usuarios',
        resultado: {
          data: mockUsers,
          meta: {
            page: 1,
            perPage: 10,
            total: 2,
            totalPages: 1,
          },
        },
      });
    });

    it('debe excluir usuarios deshabilitados por defecto', async () => {
      (UserModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);
      (UserModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await getUsers(mockRequest as AuthRequest, mockResponse as Response);

      expect(UserModel.find).toHaveBeenCalledWith({ enabled: true });
    });
  });

  describe('updateUser', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439011' },
        body: { nombre: 'Juan Carlos Pérez' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe actualizar un usuario exitosamente (mismo usuario)', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Carlos Pérez',
        email: 'juan@test.com',
        enabled: true,
      };

      (UserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await updateUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Usuario actualizado',
        resultado: mockUser,
      });
    });

    it('debe actualizar un usuario exitosamente (con permiso MODIFY_USERS)', async () => {
      mockRequest.user = {
        id: '507f1f77bcf86cd799439012',
        roles: ['MODIFY_USERS'],
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Carlos Pérez',
        email: 'juan@test.com',
        enabled: true,
      };

      (UserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await updateUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Usuario actualizado',
        resultado: mockUser,
      });
    });

    it('debe fallar cuando no tiene permisos', async () => {
      mockRequest.user = {
        id: '507f1f77bcf86cd799439012',
        roles: ['USER'],
      };

      await updateUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No tienes permisos para modificar este usuario',
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await updateUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });
  });

  describe('deleteUser / disableUser', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439011' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe deshabilitar un usuario exitosamente (mismo usuario)', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        enabled: false,
      };

      (UserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await deleteUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Usuario deshabilitado',
        resultado: { id: mockUser._id },
      });
    });

    it('debe deshabilitar un usuario exitosamente (con permiso DISABLE_USERS)', async () => {
      mockRequest.user = {
        id: '507f1f77bcf86cd799439012',
        roles: ['DISABLE_USERS'],
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        enabled: false,
      };

      (UserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await deleteUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Usuario deshabilitado',
        resultado: { id: mockUser._id },
      });
    });

    it('debe fallar cuando no tiene permisos', async () => {
      mockRequest.user = {
        id: '507f1f77bcf86cd799439012',
        roles: ['USER'],
      };

      await deleteUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No tienes permisos para deshabilitar este usuario',
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      (UserModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await deleteUser(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });
  });

  describe('getUserReservations', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439011' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe obtener historial de reservas exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        titulo: 'Libro Test',
        autor: 'Autor Test',
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Pérez',
        enabled: true,
        reservas: [
          {
            bookId: mockBook,
            reservadoAt: new Date('2024-01-01'),
            entregaAt: new Date('2024-01-15'),
          },
        ],
        populate: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          nombre: 'Juan Pérez',
          enabled: true,
          reservas: [
            {
              bookId: mockBook,
              reservadoAt: new Date('2024-01-01'),
              entregaAt: new Date('2024-01-15'),
            },
          ],
        }),
      };

      (UserModel.findById as jest.Mock) = jest.fn().mockReturnValue(mockUser);

      await getUserReservations(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Historial de reservas',
        resultado: expect.arrayContaining([
          expect.objectContaining({
            libro: expect.objectContaining({
              id: mockBook._id,
              titulo: 'Libro Test',
            }),
            fechaReserva: expect.any(Date),
            fechaEntrega: expect.any(Date),
          }),
        ]),
      });
    });

    it('debe fallar cuando no tiene permisos', async () => {
      mockRequest.user = {
        id: '507f1f77bcf86cd799439012',
        roles: ['USER'],
      };

      await getUserReservations(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No tienes permisos para ver este historial',
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await getUserReservations(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });
  });
});

