export const WAIVER_TEXT_VERSION = 'v2';

export const FIRST_MEAL_WAIVER_TEXT =
  'I voluntarily agree to waive my first 30-minute off-duty meal period today because my total work period will be no more than six (6) hours. I understand that this waiver is mutual and voluntary, and I may revoke this waiver at any time by notifying my supervisor or starting my meal period.';

export const SECOND_MEAL_WAIVER_TEXT =
  'I voluntarily agree to waive my second 30-minute off-duty meal period today because my total work period will not exceed twelve (12) hours and I have taken my first meal period. I understand that this waiver is mutual and voluntary, and I may revoke this waiver at any time by notifying my supervisor or starting my meal period.';

// Legacy export for backwards compatibility
export const WAIVER_TEXT = FIRST_MEAL_WAIVER_TEXT;

export const ATTESTATION_TEXT_VERSION = 'v2';

export const ATTESTATION_OPTION_A_TEXT =
  'I was provided a reasonable opportunity to take a 30-minute off-duty meal period, was relieved of all duties, and I voluntarily chose to:';

export const ATTESTATION_OPTION_A_SUBOPTIONS = {
  NOT_TAKEN: 'Not take my meal period',
  SHORTER: 'Take a shorter meal period',
  LATE: 'Take my meal period later than the required time'
} as const;

export const ATTESTATION_OPTION_B_TEXT =
  'I was NOT provided a reasonable opportunity to take a compliant meal period, OR I was required to remain on duty during my meal period. I understand I am entitled to one hour of premium pay at my regular rate.';

// Legacy export for backwards compatibility
export const ATTESTATION_TEXT = ATTESTATION_OPTION_A_TEXT;

export type OptionASuboption = keyof typeof ATTESTATION_OPTION_A_SUBOPTIONS;
