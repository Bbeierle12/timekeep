import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';
import { useAuth } from './useAuth';

type ConsentStatus = {
  hasConsented: boolean;
  consentedAt: string | null;
  consentVersion: string | null;
  requiresReconsent: boolean;
};

type ConsentResponse = {
  success: boolean;
  consentedAt: string;
};

export function useCCPAConsent() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  // Check current consent status
  const {
    data: consentStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ccpa-consent', user?.id],
    queryFn: async () => {
      const result = await apiRequest<ConsentStatus>('/api/consent/location', {
        token: token ?? undefined,
      });
      return result;
    },
    enabled: !!token && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Record consent
  const consentMutation = useMutation({
    mutationFn: async (accepted: boolean) => {
      const result = await apiRequest<ConsentResponse>('/api/consent/location', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ accepted }),
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ccpa-consent', user?.id] });
    },
  });

  const recordConsent = async (accepted: boolean) => {
    return consentMutation.mutateAsync(accepted);
  };

  const needsConsent = !isLoading && (!consentStatus?.hasConsented || consentStatus?.requiresReconsent);

  return {
    consentStatus,
    isLoading,
    error,
    needsConsent,
    recordConsent,
    isRecordingConsent: consentMutation.isPending,
    recordConsentError: consentMutation.error,
  };
}
