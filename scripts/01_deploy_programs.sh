#!/bin/bash
set -e

echo "=== SPL-578 Deploy Scripts ==="
echo "Step 1: Building all programs..."
anchor build

echo ""
echo "Step 2: Syncing program keys..."
anchor keys sync

echo ""
echo "Step 3: Rebuilding with correct IDs..."
anchor build

echo ""
echo "Step 4: Deploying to Devnet..."
anchor deploy --provider.cluster devnet

echo ""
echo "Step 5: Listing deployed program IDs..."
anchor keys list

echo ""
echo "=== Deployment complete! ==="
echo "Update .env with the program IDs above."
