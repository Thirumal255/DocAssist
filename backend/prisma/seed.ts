import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const doctorPassword = await bcrypt.hash('doctor123', 10);

  console.log('✅ Passwords hashed');

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@docassist.in' },
    update: { password: adminPassword },
    create: {
      email: 'admin@docassist.in',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
      phone: '9999999999',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create Doctor 1
  const doctor1 = await prisma.user.upsert({
    where: { email: 'dr.sharma@docassist.in' },
    update: { password: doctorPassword },
    create: {
      email: 'dr.sharma@docassist.in',
      password: doctorPassword,
      name: 'Dr. Ramesh Sharma',
      role: 'doctor',
      phone: '9876543210',
      specialty: 'General Medicine',
      registrationNo: 'MCI-12345',
    },
  });
  console.log('✅ Doctor created:', doctor1.email);

  // Create Doctor 2
  const doctor2 = await prisma.user.upsert({
    where: { email: 'dr.patel@docassist.in' },
    update: { password: doctorPassword },
    create: {
      email: 'dr.patel@docassist.in',
      password: doctorPassword,
      name: 'Dr. Priya Patel',
      role: 'doctor',
      phone: '9876543211',
      specialty: 'Cardiology',
      registrationNo: 'MCI-67890',
    },
  });
  console.log('✅ Doctor created:', doctor2.email);

  // Clear existing availability
  await prisma.doctorAvailability.deleteMany({});

  // Set availability for Dr. Sharma - 15 min slots
  // Monday to Friday: Morning 9am-1pm AND Evening 5pm-8pm
  // Saturday: Morning 10am-1pm only
  const sharmaAvailability = [
    // Monday
    { doctorId: doctor1.id, dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDuration: 15 },
    { doctorId: doctor1.id, dayOfWeek: 1, startTime: '17:00', endTime: '20:00', slotDuration: 15 },
    // Tuesday
    { doctorId: doctor1.id, dayOfWeek: 2, startTime: '09:00', endTime: '13:00', slotDuration: 15 },
    { doctorId: doctor1.id, dayOfWeek: 2, startTime: '17:00', endTime: '20:00', slotDuration: 15 },
    // Wednesday
    { doctorId: doctor1.id, dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDuration: 15 },
    { doctorId: doctor1.id, dayOfWeek: 3, startTime: '17:00', endTime: '20:00', slotDuration: 15 },
    // Thursday
    { doctorId: doctor1.id, dayOfWeek: 4, startTime: '09:00', endTime: '13:00', slotDuration: 15 },
    { doctorId: doctor1.id, dayOfWeek: 4, startTime: '17:00', endTime: '20:00', slotDuration: 15 },
    // Friday
    { doctorId: doctor1.id, dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDuration: 15 },
    { doctorId: doctor1.id, dayOfWeek: 5, startTime: '17:00', endTime: '20:00', slotDuration: 15 },
    // Saturday (morning only)
    { doctorId: doctor1.id, dayOfWeek: 6, startTime: '10:00', endTime: '13:00', slotDuration: 15 },
  ];

  await prisma.doctorAvailability.createMany({ data: sharmaAvailability });
  console.log('✅ Dr. Sharma: Mon-Fri 9am-1pm & 5pm-8pm, Sat 10am-1pm (15 min slots)');

  // Set availability for Dr. Patel - 15 min slots
  const patelAvailability = [
    { doctorId: doctor2.id, dayOfWeek: 2, startTime: '10:00', endTime: '14:00', slotDuration: 15 },
    { doctorId: doctor2.id, dayOfWeek: 4, startTime: '10:00', endTime: '14:00', slotDuration: 15 },
    { doctorId: doctor2.id, dayOfWeek: 6, startTime: '10:00', endTime: '14:00', slotDuration: 15 },
  ];

  await prisma.doctorAvailability.createMany({ data: patelAvailability });
  console.log('✅ Dr. Patel: Tue/Thu/Sat 10am-2pm (15 min slots)');

  // Create sample patients
  const patient1 = await prisma.patient.upsert({
    where: { phone: '9876500001' },
    update: {},
    create: {
      name: 'Priya Menon',
      dob: new Date('1984-05-15'),
      gender: 'female',
      phone: '9876500001',
      bloodGroup: 'O+',
      chronicConditions: ['diabetes', 'hypertension'],
      allergies: ['Penicillin'],
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { phone: '9876500002' },
    update: {},
    create: {
      name: 'Arun Kumar',
      dob: new Date('1990-08-22'),
      gender: 'male',
      phone: '9876500002',
      bloodGroup: 'B+',
    },
  });

  const patient3 = await prisma.patient.upsert({
    where: { phone: '9876500003' },
    update: {},
    create: {
      name: 'Sita Devi',
      dob: new Date('1965-12-10'),
      gender: 'female',
      phone: '9876500003',
      bloodGroup: 'A+',
      chronicConditions: ['hypertension'],
      allergies: ['Sulfa drugs'],
    },
  });

  console.log('✅ Patients created:', patient1.name, ',', patient2.name, ',', patient3.name);

  console.log('\n🎉 Seed completed!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  👤 Admin:');
  console.log('     Email: admin@docassist.in');
  console.log('     Password: admin123');
  console.log('');
  console.log('  👨‍⚕️ Dr. Sharma (General Medicine):');
  console.log('     Email: dr.sharma@docassist.in');
  console.log('     Password: doctor123');
  console.log('     Available: Mon-Fri 9am-1pm & 5pm-8pm, Sat 10am-1pm');
  console.log('');
  console.log('  👩‍⚕️ Dr. Patel (Cardiology):');
  console.log('     Email: dr.patel@docassist.in');
  console.log('     Password: doctor123');
  console.log('     Available: Tue/Thu/Sat 10am-2pm');
  console.log('');
  console.log('  ⏱️  Appointment Slot Duration: 15 minutes');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
