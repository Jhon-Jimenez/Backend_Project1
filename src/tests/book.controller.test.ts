import { Request, Response } from 'express';
import BookModel from '../models/book.model';
import UserModel from '../models/user.model';
import {
  createBook,
  getBook,
  getBookById,
  getBooks,
  updateBook,
  deleteBook,
  disableBook,
  reserveBook,
  returnBook,
  deliverBook,
  getBookReservations,
} from '../controllers/book.controller';
import { AuthRequest } from '../middlewares/auth.middleware';

// Mock de los modelos
jest.mock('../models/book.model');
jest.mock('../models/user.model');

describe('Book Controller', () => {
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

  describe('createBook', () => {
    beforeEach(() => {
      mockRequest = {
        body: {
          titulo: 'El Quijote',
          autor: 'Miguel de Cervantes',
          descripcion: 'Novela clásica',
          categoria: 'Literatura',
          casaEditorial: 'Editorial Test',
          fechaPublicacion: '1605-01-01',
          stock: 1,
        },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['CREATE_BOOKS'],
        },
      } as AuthRequest;
    });

    it('debe crear un libro exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        titulo: 'El Quijote',
        autor: 'Miguel de Cervantes',
        descripcion: 'Novela clásica',
        categoria: 'Literatura',
        casaEditorial: 'Editorial Test',
        fechaPublicacion: new Date('1605-01-01'),
        stock: 1,
        enabled: true,
        reservas: [],
      };

      (BookModel.create as jest.Mock) = jest.fn().mockResolvedValue(mockBook);

      await createBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Libro creado',
        resultado: mockBook,
      });
    });

    it('debe fallar cuando faltan datos requeridos', async () => {
      mockRequest.body = {
        titulo: 'El Quijote',
        autor: 'Miguel de Cervantes',
        // Faltan casaEditorial, fechaPublicacion, stock
      };

      await createBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Datos incompletos o inválidos',
      });
    });

    it('debe fallar cuando stock no es un número', async () => {
      mockRequest.body = {
        titulo: 'El Quijote',
        autor: 'Miguel de Cervantes',
        casaEditorial: 'Editorial Test',
        fechaPublicacion: '1605-01-01',
        stock: 'no-es-numero',
      };

      await createBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Datos incompletos o inválidos',
      });
    });
  });

  describe('getBook / getBookById', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439021' },
      } as Request;
    });

    it('debe obtener un libro exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        titulo: 'El Quijote',
        autor: 'Miguel de Cervantes',
        enabled: true,
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);

      await getBook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Libro encontrado',
        resultado: mockBook,
      });
    });

    it('debe fallar cuando el libro no existe', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await getBook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });

    it('debe fallar cuando el libro está deshabilitado', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439021',
        enabled: false,
      });

      await getBook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });
  });

  describe('getBooks', () => {
    beforeEach(() => {
      mockRequest = {
        query: { page: '1', limit: '10' },
      } as Request;
    });

    it('debe obtener lista de libros exitosamente', async () => {
      const mockBooks = [
        { _id: '507f1f77bcf86cd799439021', titulo: 'El Quijote' },
        { _id: '507f1f77bcf86cd799439022', titulo: 'Cien años de soledad' },
      ];

      (BookModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(2);
      (BookModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockBooks),
          }),
        }),
      });

      await getBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Lista de libros',
        resultado: {
          data: mockBooks,
          meta: {
            page: 1,
            perPage: 10,
            total: 2,
            totalPages: 1,
          },
        },
      });
    });

    it('debe filtrar por categoría', async () => {
      mockRequest.query = { categoria: 'Literatura', page: '1', limit: '10' };

      (BookModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);
      (BookModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await getBooks(mockRequest as Request, mockResponse as Response);

      expect(BookModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria: expect.objectContaining({ $regex: 'Literatura', $options: 'i' }),
        })
      );
    });

    it('debe filtrar por autor', async () => {
      mockRequest.query = { autor: 'Cervantes', page: '1', limit: '10' };

      (BookModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(1);
      (BookModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await getBooks(mockRequest as Request, mockResponse as Response);

      expect(BookModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          autor: expect.objectContaining({ $regex: 'Cervantes', $options: 'i' }),
        })
      );
    });

    it('debe excluir libros deshabilitados por defecto', async () => {
      (BookModel.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);
      (BookModel.find as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await getBooks(mockRequest as Request, mockResponse as Response);

      expect(BookModel.find).toHaveBeenCalledWith({ enabled: true });
    });
  });

  describe('updateBook', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439021' },
        body: { stock: 2 },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe actualizar un libro exitosamente (sin modificar información)', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        titulo: 'El Quijote',
        stock: 2,
        enabled: true,
      };

      (BookModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockBook);

      await updateBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Libro actualizado',
        resultado: mockBook,
      });
    });

    it('debe actualizar información del libro con permiso MODIFY_BOOKS', async () => {
      mockRequest.body = { titulo: 'Don Quijote de la Mancha' };
      mockRequest.user = {
        id: '507f1f77bcf86cd799439011',
        roles: ['MODIFY_BOOKS'],
      };

      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        titulo: 'Don Quijote de la Mancha',
        enabled: true,
      };

      (BookModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockBook);

      await updateBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Libro actualizado',
        resultado: mockBook,
      });
    });

    it('debe fallar cuando intenta modificar información sin permiso MODIFY_BOOKS', async () => {
      mockRequest.body = { titulo: 'Don Quijote de la Mancha' };

      await updateBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No tienes permisos para modificar la información del libro',
      });
    });

    it('debe fallar cuando el libro no existe', async () => {
      (BookModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      await updateBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });

    it('debe fallar cuando el libro está deshabilitado', async () => {
      (BookModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439021',
        enabled: false,
      });

      await updateBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });
  });

  describe('deleteBook / disableBook', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439021' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['DISABLE_BOOKS'],
        },
      } as AuthRequest;
    });

    it('debe deshabilitar un libro exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: false,
      };

      (BookModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(mockBook);

      await deleteBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Libro deshabilitado',
        resultado: { id: mockBook._id },
      });
    });

    it('debe fallar cuando el libro no existe', async () => {
      (BookModel.findByIdAndUpdate as jest.Mock) = jest.fn().mockResolvedValue(null);

      await deleteBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });
  });

  describe('reserveBook', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439021' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe reservar un libro exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        titulo: 'El Quijote',
        enabled: true,
        reservas: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Pérez',
        enabled: true,
        reservas: [],
        save: jest.fn().mockResolvedValue(true),
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      await reserveBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Reserva registrada',
        resultado: { bookId: mockBook._id },
      });
      expect(mockBook.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debe fallar cuando no está autenticado', async () => {
      mockRequest.user = undefined;

      await reserveBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No autenticado',
      });
    });

    it('debe fallar cuando el libro no existe', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await reserveBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: true,
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await reserveBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });

    it('debe fallar cuando el libro está deshabilitado', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: false,
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        enabled: true,
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      await reserveBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'El libro no está disponible',
      });
    });
  });

  describe('returnBook / deliverBook', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439021' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe entregar un libro exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: true,
        reservas: [
          {
            userId: '507f1f77bcf86cd799439011',
            nombreReserva: 'Juan Pérez',
            reservadoAt: new Date('2024-01-01'),
            entregaAt: undefined,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        nombre: 'Juan Pérez',
        enabled: true,
        reservas: [
          {
            bookId: '507f1f77bcf86cd799439021',
            reservadoAt: new Date('2024-01-01'),
            entregaAt: undefined,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      await returnBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Devolución registrada',
        resultado: { bookId: mockBook._id },
      });
      expect(mockBook.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('debe fallar cuando no está autenticado', async () => {
      mockRequest.user = undefined;

      await returnBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No autenticado',
      });
    });

    it('debe fallar cuando el libro no existe', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await returnBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });

    it('debe fallar cuando el libro está deshabilitado', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439021',
        enabled: false,
      });

      await returnBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });

    it('debe fallar cuando el usuario no existe', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: true,
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await returnBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });

    it('debe fallar cuando el usuario está deshabilitado', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: true,
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        enabled: false,
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);
      (UserModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockUser);

      await returnBook(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Usuario no encontrado',
      });
    });
  });

  describe('getBookReservations', () => {
    beforeEach(() => {
      mockRequest = {
        params: { id: '507f1f77bcf86cd799439021' },
        user: {
          id: '507f1f77bcf86cd799439011',
          roles: ['USER'],
        },
      } as AuthRequest;
    });

    it('debe obtener historial de reservas exitosamente', async () => {
      const mockBook = {
        _id: '507f1f77bcf86cd799439021',
        enabled: true,
        reservas: [
          {
            nombreReserva: 'Juan Pérez',
            reservadoAt: new Date('2024-01-01'),
            entregaAt: new Date('2024-01-15'),
          },
          {
            nombreReserva: 'María García',
            reservadoAt: new Date('2024-02-01'),
            entregaAt: null,
          },
        ],
      };

      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(mockBook);

      await getBookReservations(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Historial de reservas del libro',
        resultado: expect.arrayContaining([
          expect.objectContaining({
            nombreReserva: 'Juan Pérez',
            fechaReserva: expect.any(Date),
            fechaEntrega: expect.any(Date),
          }),
          expect.objectContaining({
            nombreReserva: 'María García',
            fechaReserva: expect.any(Date),
            fechaEntrega: null,
          }),
        ]),
      });
    });

    it('debe fallar cuando el libro no existe', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await getBookReservations(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });

    it('debe fallar cuando el libro está deshabilitado', async () => {
      (BookModel.findById as jest.Mock) = jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439021',
        enabled: false,
      });

      await getBookReservations(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Libro no encontrado',
      });
    });
  });
});

