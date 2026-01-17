export class AttestationRequiredError extends Error {
  public readonly code = 'ATTESTATION_REQUIRED';
  public readonly violationType: string;

  constructor(violationType: string) {
    super('You must complete an attestation before clocking out');
    this.name = 'AttestationRequiredError';
    this.violationType = violationType;
  }
}
