//import { Keypair, Contract, SorobanRpc, Networks } from '@stellar/stellar-sdk'

const API_KEY =
  'sk_2379462dc41b6c3b83ee593f4803adf4098d85de6e13ce9a95f9a4c9f5c90630';
const BASE_URL = 'https://api.defindex.io';

async function getVaultApy(vaultAddress: string): Promise<number> {
  const response = await fetch(`${BASE_URL}/vault/${vaultAddress}/apy`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch APY');
  }

  const data = await response.json();
  return data.apy;
}

// Example usage
getVaultApy('CBYQ6LIUFBXPKN57AMP6YBPX4EKBSGPLZBO4CN4R5HYJXY57M3MQRRGQ')
  .then((apy) => {
    console.log('Vault APY:', apy);
  })
  .catch((err) => {
    console.error('Error:', err.message);
  });
