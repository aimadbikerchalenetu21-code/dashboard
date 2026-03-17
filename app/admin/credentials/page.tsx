import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendCredentialsButton } from "@/components/admin/resend-button";
import { RevokeCredentialButton } from "@/components/admin/revoke-button";
import Link from "next/link";
import { Key } from "lucide-react";

const PAGE_SIZE = 20;

async function getCredentials(page: number, active?: string) {
  const skip = (page - 1) * PAGE_SIZE;
  const where =
    active === "true" ? { isActive: true } : active === "false" ? { isActive: false } : {};

  const [credentials, total] = await Promise.all([
    db.credential.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        client: { select: { id: true, name: true, email: true } },
        order: { select: { planName: true, store: { select: { name: true } } } },
        deliveryLogs: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { channel: true, status: true, sentAt: true },
        },
      },
    }),
    db.credential.count({ where }),
  ]);
  return { credentials, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export default async function CredentialsPage({
  searchParams,
}: {
  searchParams: { page?: string; active?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { credentials, total, totalPages } = await getCredentials(page, searchParams.active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Credentials</h1>
        <p className="text-muted-foreground mt-1">{total} total credentials</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { label: "All", value: "" },
          { label: "Active", value: "true" },
          { label: "Inactive", value: "false" },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/admin/credentials?active=${f.value}&page=1`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              (searchParams.active ?? "") === f.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Username
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Expires
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Delivery
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => {
                  const isExpired = new Date(cred.expiresAt) < new Date();
                  const emailLog = cred.deliveryLogs.find((l) => l.channel === "EMAIL");
                  const waLog = cred.deliveryLogs.find((l) => l.channel === "WHATSAPP");

                  return (
                    <tr key={cred.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/clients/${cred.client.id}`}
                          className="hover:underline"
                        >
                          <p className="font-medium">{cred.client.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{cred.client.email}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium">{cred.order.planName}</p>
                          <p className="text-xs text-muted-foreground">{cred.order.store.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">{cred.xtreamUsername}</td>
                      <td className="px-6 py-3">
                        <span className={isExpired ? "text-red-600" : "text-green-600"}>
                          {formatDate(cred.expiresAt)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={cred.isActive && !isExpired ? "success" : "secondary"}>
                          {!cred.isActive ? "Revoked" : isExpired ? "Expired" : "Active"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          {emailLog && (
                            <span
                              className={
                                emailLog.status === "SENT" ? "text-green-600" : "text-red-500"
                              }
                            >
                              Email: {emailLog.status}
                            </span>
                          )}
                          {waLog && (
                            <span
                              className={
                                waLog.status === "SENT" ? "text-green-600" : "text-red-500"
                              }
                            >
                              WA: {waLog.status}
                            </span>
                          )}
                          {!emailLog && !waLog && (
                            <span className="text-muted-foreground">Not delivered</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <ResendCredentialsButton credentialId={cred.id} size="sm" />
                          {cred.isActive && (
                            <RevokeCredentialButton credentialId={cred.id} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {credentials.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No credentials found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/credentials?page=${page - 1}&active=${searchParams.active ?? ""}`}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/credentials?page=${page + 1}&active=${searchParams.active ?? ""}`}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
