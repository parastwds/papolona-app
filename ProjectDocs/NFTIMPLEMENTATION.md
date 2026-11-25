# Let's implement #1 Blockchain + #2 Wallet Connection in Papolona first.

# For this stage

1. Blockchain: Polygon PoS
2. Wallet Connection: Reown AppKit (formerly WalletConnect)
3. React Native: TypeScript
4. Goal: `Connect Wallet` → user approves → Papolona receives wallet address → display address
5. Do not implementing minting yet. We first make wallet connection reliable.

### Implementation details

1. Create a new screen `WalletScreen` under `src/features/wallet`.
2. In `WalletScreen`:
   - Add a button "Connect Wallet".
   - When clicked, open Reown AppKit modal.
   - Listen for `onConnect` event to get the wallet address.
   - Display the wallet address in the UI.
3. Make sure to add all necessary imports and configurations for Reown AppKit.
4. Add unit tests for wallet connection functionality.

### User flow

1. User clicks "Connect Wallet"
2. Modal opens with list of wallets (Rainbow, MetaMask, Trust Wallet, etc.)
3. User selects a wallet
4. App opens the wallet app or In-App Browser
5. User approves the connection
6. Wallet returns the user's address to Papolona
7. Papolona displays the address in the UI

### STEPS

1. Step 1: Install the SDK `(npm install @reown/appkit-react-native)`
2. Step 2: Initialize the SDK
3. Step 3: Create the Connect Wallet screen
4. Step 4: Connect with WalletConnectModal
5. Step 5: Listen for the onConnect event
6. Step 6: Display the wallet address in the UI
7. Step 7: Add unit tests for wallet connection functionality.

```
1. Create the blockchain configuration
src/
├── config/
│   └── blockchain.ts
│
└── features/
    └── nft/
        ├── components/
        │   └── WalletButton.tsx
        ├── hooks/
        │   └── useWallet.ts
        └── screens/
            └── NFTHomeScreen.tsx
```

## I would ask the backend developer for APIs in 3 groups:

1. Wallet APIs
2. NFT APIs
3. Transaction / minting APIs

```
WALLET
────────────────────────────────────────
POST   /api/v1/wallets
GET    /api/v1/wallets/me
DELETE /api/v1/wallets/{address}
Wallet signature verification
SIWE / wallet ownership verification

NFT
────────────────────────────────────────
GET    /api/v1/nfts/my
GET    /api/v1/nfts/{tokenId}
GET    /api/v1/nfts
POST   /api/v1/nfts/mint
GET    /api/v1/nfts/mint/{mintRequestId}

TRANSACTIONS
────────────────────────────────────────
GET    /api/v1/transactions/{hash}

OPTIONAL
────────────────────────────────────────
POST   /api/v1/nfts/metadata
GET    /api/v1/nfts/{tokenId}/metadata
```

## Hi, we are starting the Papolona NFT module.

For the first implementation, we are targeting Polygon Amoy testnet and later Polygon mainnet.

Please prepare the backend/API layer for the following NFT functionality:

1. Wallet

- Link/register a user's wallet address.
- Get the authenticated user's wallet.
- Implement wallet ownership verification using a signed message / SIWE rather than trusting a wallet address sent by the client.
- Store wallet address + chain/network information.

Suggested APIs:
POST /api/v1/wallets
GET /api/v1/wallets/me

2. NFT

- Get NFTs owned by the authenticated user.
- Get NFT details by token ID.
- Support NFT mint requests.
- Return token ID, contract address, metadata URI, image, owner address, transaction hash and status.

Suggested APIs:
GET /api/v1/nfts/my
GET /api/v1/nfts/{tokenId}
POST /api/v1/nfts/mint
GET /api/v1/nfts/mint/{mintRequestId}

3. Minting
   For Papolona-issued certificates, we are considering a backend-controlled/authorized minter model.

The mobile app should request a mint; the backend should validate eligibility and initiate the blockchain transaction using the authorized minter wallet.

The backend should return a mint request ID and expose the transaction status.

Possible statuses:
pending
processing
submitted
confirmed
failed

4. Transaction
   GET /api/v1/transactions/{transactionHash}

Please also design the database so we can store:

- user ID
- wallet address
- chain ID
- contract address
- token ID
- metadata URI
- transaction hash
- mint status
- timestamps

Important security requirement:
No private key or seed phrase should ever be returned to or stored in the React Native application.

For now, please build against Polygon Amoy testnet. We will switch to Polygon mainnet after testing.

#
