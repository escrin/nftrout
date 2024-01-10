use ethers::{
    middleware::contract::{Eip712, EthAbiType},
    types::{transaction::eip712::Eip712, Address, Signature},
};

use super::*;

#[derive(Clone, Default, EthAbiType, Eip712)]
#[eip712(
    name = "NameRequest",
    version = "1",
    chain_id = 23294,
    verifying_contract = "0x0000000000000000000000000000000000000000"
)]
pub struct NameRequest {
    pub trout: U256,
    pub name: String,
}

impl NameRequest {
    pub fn new(trout: TokenId, name: String) -> Self {
        Self {
            trout: trout.into(),
            name,
        }
    }

    pub fn hash(&self) -> [u8; 32] {
        self.encode_eip712().unwrap()
    }

    pub fn verify(&self, sig: &Signature, whom: Address) -> bool {
        sig.verify(self.hash(), whom).is_ok()
    }
}
