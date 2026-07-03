-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('DRAFT', 'IN_APPROVAL', 'ADJUSTMENT_REQUESTED', 'IN_FINANCE_REVIEW', 'SCHEDULED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialEntryStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ADJUSTMENT_REQUESTED');

-- CreateEnum
CREATE TYPE "FinancialEntryPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "financial_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "competencia" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "priority" "FinancialEntryPriority",
    "notes" TEXT,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_entry_approval_steps" (
    "id" TEXT NOT NULL,
    "financialEntryId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "hierarchyAssignmentId" TEXT NOT NULL,
    "status" "FinancialEntryStepStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_entry_approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_entries_providerId_idx" ON "financial_entries"("providerId");

-- CreateIndex
CREATE INDEX "financial_entries_companyId_status_idx" ON "financial_entries"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_companyId_entryNumber_key" ON "financial_entries"("companyId", "entryNumber");

-- CreateIndex
CREATE INDEX "financial_entry_approval_steps_financialEntryId_idx" ON "financial_entry_approval_steps"("financialEntryId");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entry_approval_steps" ADD CONSTRAINT "financial_entry_approval_steps_financialEntryId_fkey" FOREIGN KEY ("financialEntryId") REFERENCES "financial_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entry_approval_steps" ADD CONSTRAINT "financial_entry_approval_steps_hierarchyAssignmentId_fkey" FOREIGN KEY ("hierarchyAssignmentId") REFERENCES "hierarchy_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entry_approval_steps" ADD CONSTRAINT "financial_entry_approval_steps_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
