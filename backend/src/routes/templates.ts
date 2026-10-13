import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import { isAllowedImage, saveUpload } from '../lib/storage';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Keep uploads in memory (max 2 MB, images only), then hand them to the
// storage module, which writes to Cloud Storage in production.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, isAllowedImage(file.mimetype)),
}).fields([
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
    const logoUrl = files?.logo
      ? await saveUpload(files.logo[0].buffer, files.logo[0].mimetype)
      : null;
    const digitalSignatureUrl = files?.signature
      ? await saveUpload(files.signature[0].buffer, files.signature[0].mimetype)
      : null;

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