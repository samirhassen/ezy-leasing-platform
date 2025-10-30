// Local type definitions
interface LoanSchedule {
  applicationId: string;
  totalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  nextDueDate?: string;
  overdueFlag: boolean;
  installments: Array<{
    id: string;
    dueDate: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
    paidAt?: string;
  }>;
}

interface LoanTimeline {
  applicationId: string;
  events: Array<{
    id: string;
    type: 'APPLICATION' | 'PREAPPROVED' | 'APPROVED' | 'DISBURSED' | 'INSTALLMENT';
    label: string;
    date: string;
    note?: string;
    amount?: number;
    reference?: string;
    installmentNumber?: number;
    status?: 'PAID' | 'PENDING' | 'OVERDUE';
  }>;
}

export interface ILoanProvider {
  getSchedule(applicationId: string): Promise<LoanSchedule>;
  getTimeline(applicationId: string): Promise<LoanTimeline>;
}

import { supabase } from "@/integrations/supabase/client";

class SupabaseLoanProvider implements ILoanProvider {
  async getSchedule(applicationId: string): Promise<LoanSchedule> {
    // Return mock data when auth is disabled
    if (import.meta.env.VITE_AUTH_DISABLED === 'true') {
      console.log('[LoanProvider] Auth disabled - returning mock schedule data');
      return {
        applicationId,
        totalAmount: 120000,
        totalPaid: 40000,
        remainingBalance: 80000,
        nextDueDate: '2024-02-15',
        overdueFlag: false,
        installments: [
          {
            id: 'inst-1',
            amount: 10000,
            dueDate: '2024-01-15',
            status: 'PAID' as const,
            paidAt: '2024-01-14'
          },
          {
            id: 'inst-2',
            amount: 10000,
            dueDate: '2024-02-15',
            status: 'PENDING' as const
          },
          {
            id: 'inst-3',
            amount: 10000,
            dueDate: '2024-03-15',
            status: 'PENDING' as const
          }
        ]
      };
    }

    const { data, error } = await supabase.functions.invoke('loan-schedule', {
      body: { applicationId },
    });
    if (error) throw error;
    return data as LoanSchedule;
  }

  async getTimeline(applicationId: string): Promise<LoanTimeline> {
    // Return mock data when auth is disabled
    if (import.meta.env.VITE_AUTH_DISABLED === 'true') {
      console.log('[LoanProvider] Auth disabled - returning mock timeline data');
      return {
        applicationId,
        events: [
          {
            id: 'evt-1',
            type: 'APPLICATION' as const,
            label: 'Application Submitted',
            date: '2023-12-01',
            note: 'Loan application submitted for processing'
          },
          {
            id: 'evt-2',
            type: 'PREAPPROVED' as const,
            label: 'Pre-approved',
            date: '2023-12-05',
            note: 'Initial approval based on documents'
          },
          {
            id: 'evt-3',
            type: 'APPROVED' as const,
            label: 'Loan Approved',
            date: '2023-12-10',
            note: 'Final approval completed'
          },
          {
            id: 'evt-4',
            type: 'DISBURSED' as const,
            label: 'Amount Disbursed',
            date: '2023-12-15',
            amount: 120000,
            reference: 'TXN-120000-001',
            note: 'Loan amount disbursed to landlord'
          }
        ]
      };
    }

    const { data, error } = await supabase.functions.invoke('loan-timeline', {
      body: { applicationId },
    });
    if (error) throw error;
    return data as LoanTimeline;
  }
}

export const loanProvider: ILoanProvider = new SupabaseLoanProvider();