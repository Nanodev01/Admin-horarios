-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dni" TEXT,
    "subject" TEXT NOT NULL,
    "entryTime" TEXT NOT NULL,
    "exitTime" TEXT NOT NULL,
    "fingerprintId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'absent',
    "lastScanTime" TEXT
);

-- CreateTable
CREATE TABLE "DaySchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "entryTime" TEXT NOT NULL,
    "exitTime" TEXT NOT NULL,
    CONSTRAINT "DaySchedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "teacherSubject" TEXT NOT NULL,
    "fingerprintId" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "securityHash" TEXT NOT NULL,
    CONSTRAINT "ScanLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_fingerprintId_key" ON "Teacher"("fingerprintId");

-- CreateIndex
CREATE UNIQUE INDEX "DaySchedule_teacherId_dayNumber_key" ON "DaySchedule"("teacherId", "dayNumber");
