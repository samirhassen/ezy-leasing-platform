import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import type { IChequeCollectionProvider } from '@ezy/domain';
import type { ChequeCollectionSubmitPayload, ChequeCollectionSubmitResponse } from '@ezy/domain';

@Injectable()
export class HttpChequeCollectionProvider implements IChequeCollectionProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger
  ) {
    this.baseUrl = config.get<string>('CHEQUE_BANK_BASE_URL') || '';
    this.apiKey = config.get<string>('CHEQUE_BANK_API_KEY') || '';
  }

  async submit(
    payload: ChequeCollectionSubmitPayload,
    ctx: { correlationId: string }
  ): Promise<ChequeCollectionSubmitResponse> {
    this.logger.info(
      { 
        requestId: payload.requestId, 
        itemsCount: payload.items.length,
        correlationId: ctx.correlationId 
      },
      '[HttpChequeCollectionProvider] Submitting cheque collection request'
    );

    // TODO: Implement actual HTTP call to bank API
    // const response = await fetch(`${this.baseUrl}/cheque-collection`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'X-Correlation-ID': ctx.correlationId,
    //   },
    //   body: JSON.stringify(payload),
    // });

    throw new Error('HTTP Cheque Collection Provider not yet implemented');
  }
}
