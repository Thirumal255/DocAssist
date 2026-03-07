import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// --- GET ROUTES ---

// Get all doctors (Public/Dropdown helper)
router.get('/doctors', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'doctor', isActive: true }, // Only active doctors
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true,
        phone: true,
        registrationNo: true,
        templateId: true,
        consultationFee: true,
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Get ALL users (Admin Dashboard - with Search & Filter)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    // 1. Extract query params
    const { search, role } = req.query;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 2. Build the "where" clause based on params
    const where: any = {};

    // Filter by Role (if provided and not 'all')
    if (role && role !== 'all') {
      where.role = role as string;
    }

    // Filter by Search (Name or Email)
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // 3. Execute Query
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialty: true,
        phone: true,
        registrationNo: true,
        createdAt: true,
        isActive: true,
        templateId: true, // <-- ADDED: So admin list knows about templates
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialty: true,
        phone: true,
        registrationNo: true,
        createdAt: true,
        isActive: true,
        templateId: true, // <-- ADDED: So the edit screen loads the current template
        consultationFee: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// --- MUTATION ROUTES ---

// Create User
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    
    // <-- ADDED templateId extraction here
    const { email, password, name, role, phone, specialty, registrationNo, templateId,consultationFee } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        phone,
        specialty: role === 'doctor' ? specialty : null,
        registrationNo: role === 'doctor' ? registrationNo : null,
        // <-- ADDED proper template assignment
        templateId: role === 'doctor' ? (templateId || null) : null,
        consultationFee: consultationFee ? Number(consultationFee) : 0,
        isActive: true,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ success: true, data: userWithoutPassword });

  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update User
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update users' });
    }

    const { id } = req.params;
    // <-- ADDED templateId extraction here
    const { name, phone, specialty, registrationNo, isActive, password, templateId,consultationFee } = req.body;

    const updateData: any = {
      name,
      phone,
      specialty,
      registrationNo,
      isActive,
      templateId,
    };
    // 2. Add this line to update the fee if provided
    if (consultationFee !== undefined) {
      updateData.consultationFee = Number(consultationFee);
    }

    // <-- ADDED: Update template ID if it was sent
    if (templateId !== undefined) {
      updateData.templateId = templateId || null;
    }

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ success: true, data: userWithoutPassword });

  } catch (error) {
    console.error('Update User Error:', error);
    if ((error as any).code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete User
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    const { id } = req.params;

    if (id === req.user?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    if ((error as any).code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;