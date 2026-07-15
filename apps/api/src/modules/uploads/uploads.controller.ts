import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Guarda el archivo en disco local (volumen de Docker, ver docker-compose.yml) y lo
 * sirve como estático desde /api/uploads/... (ver main.ts). Sin Azure Blob Storage
 * conectado (mismo caso que Wompi/Azure AI Vision): esto es real y funciona, pero no
 * sobrevive a un `docker compose down -v` que borre el volumen — para producción el
 * reemplazo natural es subir a Blob Storage en vez de al filesystem del contenedor.
 */
@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROVIDER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'products');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File): { url: string } {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    return { url: `/api/uploads/products/${file.filename}` };
  }
}
