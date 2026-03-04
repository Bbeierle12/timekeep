use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct EmployeeSummary {
    pub id: String,
    pub initials: String,
    pub full_name: String,
}
