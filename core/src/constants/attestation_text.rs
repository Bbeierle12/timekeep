pub const ATTESTATION_TEXT_VERSION: &str = "v2";

pub const ATTESTATION_OPTION_A_TEXT: &str = "I was provided a reasonable opportunity to take \
a 30-minute off-duty meal period, was relieved of all duties, and I voluntarily chose to:";

pub const ATTESTATION_OPTION_A_NOT_TAKEN: &str = "Not take my meal period";
pub const ATTESTATION_OPTION_A_SHORTER: &str = "Take a shorter meal period";
pub const ATTESTATION_OPTION_A_LATE: &str = "Take my meal period later than the required time";

pub const ATTESTATION_OPTION_B_TEXT: &str = "I was NOT provided a reasonable opportunity to \
take a compliant meal period, OR I was required to remain on duty during my meal period. \
I understand I am entitled to one hour of premium pay at my regular rate.";

/// Legacy alias for backwards compatibility.
pub const ATTESTATION_TEXT: &str = ATTESTATION_OPTION_A_TEXT;

/// Enum for Option A sub-options.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OptionASuboption {
    NotTaken,
    Shorter,
    Late,
}

impl OptionASuboption {
    pub fn text(&self) -> &'static str {
        match self {
            Self::NotTaken => ATTESTATION_OPTION_A_NOT_TAKEN,
            Self::Shorter => ATTESTATION_OPTION_A_SHORTER,
            Self::Late => ATTESTATION_OPTION_A_LATE,
        }
    }
}
