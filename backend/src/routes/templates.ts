import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Configure where and how Multer saves files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to backend/uploads/
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename: timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// We expect up to two files: a logo and a signature
const upload = multer({ storage }).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);

// POST /api/templates - Create a new template (Admin Only)
router.post('/', authMiddleware, upload, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create templates' });
    }

    const { 
      name, brandColor, headerStyle, paperSize, 
      clinicName, clinicAddress, clinicContact, footerText,
      showVitals, showDiagnosis, showPatientDetails
    } = req.body;

    // Extract uploaded files if they exist
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const logoUrl = files?.logo ? `/uploads/${files.logo[0].filename}` : null;
    const digitalSignatureUrl = files?.signature ? `/uploads/${files.signature[0].filename}` : null;

    // Create the template in the database
    // Note: FormData sends booleans as strings ("true"/"false"), so we convert them
    const template = await prisma.prescriptionTemplate.create({
      data: {
        name,
        brandColor: brandColor || '#0A7B6E',
        headerStyle: headerStyle || 'left',
        paperSize: paperSize || 'A4',
        clinicName,
        clinicAddress,
        clinicContact,
        footerText,
        showVitals: showVitals === 'true',
        showDiagnosis: showDiagnosis === 'true',
        showPatientDetails: showPatientDetails === 'true',
        logoUrl,
        digitalSignatureUrl
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /api/templates - Get all templates (used for the dropdown in "Add User")
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.prescriptionTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

export default router;