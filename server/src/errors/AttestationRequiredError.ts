import { ApiError } from './ApiError';

export class AttestationRequiredError extends ApiError {
  public readonly violationType: string;

  constructor(violationType: string) {
    super(
      400,
      'ATTESTATION_REQUIRED',
      'You must complete an attestation before clocking out',
      { violationType }
    );
    this.name = 'AttestationRequiredError';
    this.violationType = violationType;
  }
}
