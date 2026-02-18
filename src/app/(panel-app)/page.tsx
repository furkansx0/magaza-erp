import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Retail ERP System</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          3 Stores • 30,000 Products • Comprehensive Management
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login">
            <Button>Login to Dashboard</Button>
          </Link>
          <Button variant="outline">Docs</Button>
        </div>
        <p className="text-xs text-gray-400 mt-8">System Status: <span className="text-green-600 font-semibold">• Live</span></p>
      </div>
    </div>
  );
}
