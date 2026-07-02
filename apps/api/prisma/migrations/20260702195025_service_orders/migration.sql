-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('PENDING_MANAGER_APPROVAL', 'PENDING_FINANCE_APPROVAL', 'ADJUSTMENT_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "commercialAgreementId" TEXT,
    "description" TEXT NOT NULL,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'PENDING_MANAGER_APPROVAL',
    "baseValue" DECIMAL(12,2) NOT NULL,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "additionals" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reimbursements" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "managerDecisionByUserId" TEXT,
    "managerDecisionAt" TIMESTAMP(3),
    "managerDecisionNote" TEXT,
    "financeDecisionByUserId" TEXT,
    "financeDecisionAt" TIMESTAMP(3),
    "financeDecisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_orders_providerId_idx" ON "service_orders"("providerId");

-- CreateIndex
CREATE INDEX "service_orders_companyId_status_idx" ON "service_orders"("companyId", "status");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_commercialAgreementId_fkey" FOREIGN KEY ("commercialAgreementId") REFERENCES "commercial_agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_managerDecisionByUserId_fkey" FOREIGN KEY ("managerDecisionByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_financeDecisionByUserId_fkey" FOREIGN KEY ("financeDecisionByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
