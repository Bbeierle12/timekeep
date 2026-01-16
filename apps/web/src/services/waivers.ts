import { apiRequest } from './api';

export type WaiverType = 'FIRST_MEAL_WAIVER' | 'SECOND_MEAL_WAIVER';

export type SignWaiverPayload = {
  workDate?: string;
  waiverType: WaiverType;
  checkboxChecked: boolean;
  signatureImage: string; // base64 encoded
  gpsLatitude?: number;
  gpsLongitude?: number;
  resolvedAddress?: string;
};

export type Waiver = {
  id: string;
  employee_id: string;
  work_date: string;
  waiver_type: WaiverType;
  checkbox_checked: boolean;
  signed_at: string;
  created_at: string;
};

export type AttestationOption = 'OPTION_A' | 'OPTION_B';
export type OptionASuboption = 'NOT_TAKEN' | 'SHORTER' | 'LATE';

export type SignAttestationPayload = {
  workDate?: string;
  selectedOption: AttestationOption;
  optionASuboption?: OptionASuboption;
  comment?: string;
  signatureImage: string; // base64 encoded
  gpsLatitude?: number;
  gpsLongitude?: number;
  resolvedAddress?: string;
};

export type Attestation = {
  id: string;
  employee_id: string;
  work_date: string;
  attestation_type: string;
  selected_option: AttestationOption;
  option_a_suboption?: OptionASuboption;
  comment?: string;
  signed_at: string;
  created_at: string;
};

export async function signWaiver(
  payload: SignWaiverPayload,
  token: string
): Promise<Waiver> {
  const response = await apiRequest<{ status: string; data: Waiver }>(
    '/api/waiver',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token
    }
  );
  return response.data;
}

export async function signAttestation(
  payload: SignAttestationPayload,
  token: string
): Promise<Attestation> {
  const response = await apiRequest<{ status: string; data: Attestation }>(
    '/api/attestation',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      token
    }
  );
  return response.data;
}
