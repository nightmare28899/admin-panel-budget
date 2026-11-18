"use client";

import { Card } from "@/components/ui/Card";
import { ListSkeleton, MetricCardsSkeleton, SkeletonBlock } from "@/components/ui/ContentSkeleton";
import { PageContainer } from "./NutritionUi";

/** Loading state shared by every nutrition page: header, metrics and a list card. */
export default function NutritionPageSkeleton() {
  return (
    <PageContainer>
      <div className="mb-4" aria-hidden="true">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <MetricCardsSkeleton count={3} className="mb-4 md:grid-cols-3" />
      <Card className="!p-4">
        <ListSkeleton rows={4} />
      </Card>
    </PageContainer>
  );
}
