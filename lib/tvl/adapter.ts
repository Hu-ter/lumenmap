export type ProtocolTvlStatus = 'complete' | 'partial' | 'stale' | 'unsupported' | 'failed';

export interface PriceProvenance {
  source: string;
  timestamp: string;
}

export interface TvlPosition {
  canonicalAsset: string;
  nativeAmount: string;
  usdValue: string;
  priceProvenance: PriceProvenance;
}

export interface TvlAdapterResultBase {
  protocol: string;
  network: 'stellar' | 'stellar-testnet';
  status: ProtocolTvlStatus;
  snapshotTime: string;
}

export interface TvlAdapterResultComplete extends TvlAdapterResultBase {
  status: 'complete';
  methodologyVersion: string;
  positions: TvlPosition[];
}

export interface TvlAdapterResultPartial extends TvlAdapterResultBase {
  status: 'partial';
  methodologyVersion: string;
  positions: TvlPosition[];
  error?: string;
}

export interface TvlAdapterResultStale extends TvlAdapterResultBase {
  status: 'stale';
  methodologyVersion: string;
  positions: TvlPosition[];
  error?: string;
}

export interface TvlAdapterResultUnsupported extends TvlAdapterResultBase {
  status: 'unsupported';
  reason: string;
}

export interface TvlAdapterResultFailed extends TvlAdapterResultBase {
  status: 'failed';
  error: string;
}

export type TvlAdapterResult = 
  | TvlAdapterResultComplete
  | TvlAdapterResultPartial
  | TvlAdapterResultStale
  | TvlAdapterResultUnsupported
  | TvlAdapterResultFailed;

export interface ProtocolTvlAdapter {
  getTvl(): Promise<TvlAdapterResult>;
}

export class ExampleTvlAdapter implements ProtocolTvlAdapter {
  private mockResult: TvlAdapterResult;

  constructor(mockResult: TvlAdapterResult) {
    this.mockResult = mockResult;
  }

  async getTvl(): Promise<TvlAdapterResult> {
    return this.mockResult;
  }
}
