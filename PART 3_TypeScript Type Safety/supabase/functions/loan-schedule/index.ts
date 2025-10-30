import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId = "APP-1001" } = (await req.json().catch(() => ({}))) as {
      applicationId?: string;
    };

    // Generate a realistic loan schedule for security deposit
    // Typical security deposit loan: 10% of annual rent (120k) = 12k AED
    const baseAmount = 12000; // realistic security deposit amount
    const months = 6; // shorter term for security deposit loans

    const start = new Date();
    start.setFullYear(2025, 2, 15); // March 15, 2025 - loan started

    const installments = Array.from({ length: months }).map((_, i) => {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + i);

      // Equal monthly installments: 12000 / 6 = 2000 AED per month
      const amount = baseAmount / months;

      // Determine status relative to today
      const now = new Date();
      let status: "PAID" | "PENDING" | "OVERDUE" = "PENDING";
      let paidAt: string | undefined;

      if (dueDate < now) {
        // First installment always paid, second might be overdue for demo
        if (i === 0) {
          status = "PAID";
          const paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + 1);
          paidAt = paidDate.toISOString();
        } else if (i === 1 && applicationId.includes("1001")) {
          // Demo: second payment overdue for APP-1001
          status = "OVERDUE";
        } else if (i === 1) {
          status = "PAID";
          const paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + 3);
          paidAt = paidDate.toISOString();
        } else {
          status = "OVERDUE";
        }
      }

      return {
        id: `${applicationId}-INST-${i + 1}`,
        dueDate: dueDate.toISOString(),
        amount: Math.round(amount),
        status,
        ...(paidAt ? { paidAt } : {}),
      };
    });

    const totalAmount = installments.reduce((sum, it) => sum + it.amount, 0);
    const totalPaid = installments
      .filter((it) => it.status === "PAID")
      .reduce((sum, it) => sum + it.amount, 0);
    const remainingBalance = totalAmount - totalPaid;

    const nextDue = installments.find((it) => it.status !== "PAID");
    const overdueFlag = installments.some((it) => it.status === "OVERDUE");

    const payload = {
      applicationId,
      totalAmount,
      totalPaid,
      remainingBalance,
      nextDueDate: nextDue?.dueDate,
      overdueFlag,
      installments,
    };

    return jsonResponse(payload);
  } catch (e) {
    console.error("[loan-schedule] error", e);
    return jsonResponse({ error: "Failed to build schedule" }, 500);
  }
});
