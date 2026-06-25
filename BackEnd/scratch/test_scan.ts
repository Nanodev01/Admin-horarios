import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Cleaning database...");
  await prisma.scanLog.deleteMany({});
  await prisma.teacher.deleteMany({});

  console.log("Creating test teacher...");
  const teacher = await prisma.teacher.create({
    data: {
      name: "Juan Perez",
      dni: "12345678",
      subject: "Matematica",
      entryTime: "08:00",
      exitTime: "13:00",
      fingerprintId: "1",
      status: "absent",
      active: true,
      schedules: {
        create: [
          { dayNumber: new Date().getDay() === 0 ? 7 : new Date().getDay(), entryTime: "08:00", exitTime: "13:00" }
        ]
      }
    }
  });

  console.log("Teacher created:", teacher);

  console.log("Testing POST /api/logs/scan simulation...");
  // Simulate POST request logic
  const fingerprintId = "1";
  const foundTeacher = await prisma.teacher.findUnique({
    where: { fingerprintId },
    include: { schedules: true }
  });

  if (!foundTeacher) {
    console.error("Error: Teacher not found");
    return;
  }

  console.log("Teacher found:", foundTeacher);
  const type = foundTeacher.status === 'present' ? 'out' : 'in';
  const now = new Date();
  const timestamp = now.toISOString();

  // Test status calculation
  let entryTime = foundTeacher.entryTime;
  let exitTime = foundTeacher.exitTime;
  if (foundTeacher.schedules && foundTeacher.schedules.length > 0) {
    const dayNumber = now.getDay() === 0 ? 7 : now.getDay();
    const schedule = foundTeacher.schedules.find(s => s.dayNumber === dayNumber);
    if (schedule) {
      entryTime = schedule.entryTime;
      exitTime = schedule.exitTime;
    }
  }

  const [entryH, entryM] = entryTime.split(':').map(Number);
  const [exitH, exitM] = exitTime.split(':').map(Number);
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  const entryMinutes = entryH * 60 + entryM;
  const exitMinutes = exitH * 60 + exitM;
  const currentMinutes = currentH * 60 + currentM;

  let status = 'outside_schedule';
  if (type === 'in') {
    if (currentMinutes <= entryMinutes + 15) {
      status = 'normal';
    } else if (currentMinutes > entryMinutes + 15 && currentMinutes < exitMinutes) {
      status = 'late';
    }
  } else {
    if (currentMinutes >= exitMinutes - 10) {
      status = 'normal';
    } else if (currentMinutes >= entryMinutes && currentMinutes < exitMinutes - 10) {
      status = 'early_exit';
    }
  }

  console.log(`Computed: type=${type}, status=${status}, time=${entryTime}-${exitTime}, current=${currentH}:${currentM}`);

  const newLog = await prisma.scanLog.create({
    data: {
      teacherId: foundTeacher.id,
      teacherName: foundTeacher.name,
      teacherSubject: foundTeacher.subject,
      fingerprintId: foundTeacher.fingerprintId,
      timestamp,
      type,
      status,
      securityHash: "TEST_HASH"
    }
  });

  console.log("Log created successfully:", newLog);

  const updatedTeacher = await prisma.teacher.update({
    where: { id: foundTeacher.id },
    data: {
      status: type === 'in' ? 'present' : 'absent',
      lastScanTime: timestamp
    }
  });

  console.log("Teacher updated successfully:", updatedTeacher);
}

run().catch(console.error);
