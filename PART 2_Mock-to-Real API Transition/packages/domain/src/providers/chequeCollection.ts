import { ChequeCollectionSubmitPayload, ChequeCollectionSubmitResponse } from '../cheques';

export interface IChequeCollectionProvider {
  submit(
    payload: ChequeCollectionSubmitPayload,
    ctx: { correlationId: string }
  ): Promise<ChequeCollectionSubmitResponse>;
}
