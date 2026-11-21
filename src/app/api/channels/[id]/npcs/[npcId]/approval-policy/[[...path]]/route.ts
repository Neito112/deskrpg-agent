import type { NextRequest } from "next/server";
import { handleApprovalPolicyRoute } from "@/lib/approval-policy-routes";

type RouteProps = {
  params: Promise<{
    id: string;
    npcId: string;
    path?: string[];
  }>;
};

export async function GET(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleApprovalPolicyRoute(req, p);
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleApprovalPolicyRoute(req, p);
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleApprovalPolicyRoute(req, p);
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  const p = await params;
  return handleApprovalPolicyRoute(req, p);
}
