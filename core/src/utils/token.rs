use hex;
use sha2::{Digest, Sha256};

/// Produces a SHA-256 hex digest of the given token string.
///
/// Mirrors the TypeScript `hashToken(token)` which uses `crypto.createHash('sha256')`.
pub fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

/// Generates a cryptographically secure random hex token.
///
/// Mirrors the TypeScript `generateSecureToken(length)` which uses `crypto.randomBytes`.
/// The `length` parameter specifies the number of random bytes (default 32),
/// producing a hex string of `length * 2` characters.
pub fn generate_secure_token(length: Option<usize>) -> String {
    let len = length.unwrap_or(32);
    let mut bytes = vec![0u8; len];
    getrandom::fill(&mut bytes).expect("failed to generate secure random bytes");
    hex::encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_token_deterministic() {
        let hash1 = hash_token("test-token");
        let hash2 = hash_token("test-token");
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_token_produces_hex() {
        let hash = hash_token("hello");
        assert_eq!(hash.len(), 64); // SHA-256 produces 64 hex characters
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_hash_token_different_inputs() {
        let hash1 = hash_token("token-a");
        let hash2 = hash_token("token-b");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_generate_secure_token_default_length() {
        let token = generate_secure_token(None);
        assert_eq!(token.len(), 64); // 32 bytes = 64 hex chars
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_generate_secure_token_custom_length() {
        let token = generate_secure_token(Some(16));
        assert_eq!(token.len(), 32); // 16 bytes = 32 hex chars
    }

    #[test]
    fn test_generate_secure_token_uniqueness() {
        let token1 = generate_secure_token(None);
        let token2 = generate_secure_token(None);
        assert_ne!(token1, token2);
    }
}
