import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const videoTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (file.fieldname === 'video' && videoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.fieldname === 'thumbnail' && imageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const errorMsg = file.fieldname === 'video' 
      ? 'Tipo de vídeo não suportado. Apenas MP4, AVI, MOV e MKV são permitidos.'
      : 'Tipo de thumbnail não suportado. Apenas JPG, PNG e WebP são permitidos.';
    cb(new Error(errorMsg), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024 * 1024, // 2GB padrão (aumentado de 500MB)
    files: 2, // Máximo 2 arquivos (vídeo + thumbnail)
    fieldSize: 10 * 1024 * 1024, // 10MB para campos
  },
  // Configurações de timeout para uploads grandes
  timeout: 30 * 60 * 1000, // 30 minutos
});

export default upload;