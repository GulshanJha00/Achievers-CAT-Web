import { Suspense } from "react";
import SectionalTabs from "@/components/SectionalTabs";

export default function SectionalMocksPage() {
  return (
    <Suspense fallback={null}>
      <SectionalTabs />
    </Suspense>
  );
}
