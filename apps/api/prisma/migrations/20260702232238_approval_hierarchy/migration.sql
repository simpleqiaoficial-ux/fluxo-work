-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "responsibleAssignmentId" TEXT;

-- CreateTable
CREATE TABLE "approval_levels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hierarchy_assignments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "approvalLevelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hierarchy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "approval_levels_companyId_order_key" ON "approval_levels"("companyId", "order");

-- CreateIndex
CREATE INDEX "hierarchy_assignments_companyId_idx" ON "hierarchy_assignments"("companyId");

-- CreateIndex
CREATE INDEX "hierarchy_assignments_parentId_idx" ON "hierarchy_assignments"("parentId");

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_responsibleAssignmentId_fkey" FOREIGN KEY ("responsibleAssignmentId") REFERENCES "hierarchy_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_levels" ADD CONSTRAINT "approval_levels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_assignments" ADD CONSTRAINT "hierarchy_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_assignments" ADD CONSTRAINT "hierarchy_assignments_approvalLevelId_fkey" FOREIGN KEY ("approvalLevelId") REFERENCES "approval_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_assignments" ADD CONSTRAINT "hierarchy_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hierarchy_assignments" ADD CONSTRAINT "hierarchy_assignments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "hierarchy_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
